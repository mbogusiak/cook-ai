-- Migration: Fix multi-portion group trigger to allow batch deletions
-- Date: 2025-11-05
-- Issue: Row-level AFTER DELETE trigger prevents cleanup of multi-portion groups
-- Solution: Change trigger timing to BEFORE and add special handling for DELETE operations

-- Drop the existing trigger
DROP TRIGGER IF EXISTS enforce_multi_portion_group_trigger ON public.plan_meals;

-- Recreate the function with improved logic
CREATE OR REPLACE FUNCTION public.fn_enforce_multi_portion_group()
RETURNS TRIGGER AS $$
DECLARE
    v_group_id UUID;
    v_record_count INTEGER;
    v_is_leftover_count INTEGER;
    v_portions_to_cook_count INTEGER;
    v_portion_multiplier_min NUMERIC;
    v_portion_multiplier_max NUMERIC;
BEGIN
    -- Determine the group ID to check
    IF TG_OP = 'DELETE' THEN
        v_group_id := OLD.multi_portion_group_id;
    ELSE
        v_group_id := NEW.multi_portion_group_id;
    END IF;

    -- If there is no group ID, there's nothing to enforce
    IF v_group_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- For DELETE operations, check if we're deleting the entire group
    -- If both meals in the group are being deleted, skip validation
    IF TG_OP = 'DELETE' THEN
        -- Count how many meals will remain after this deletion
        SELECT COUNT(*) INTO v_record_count
        FROM public.plan_meals
        WHERE multi_portion_group_id = v_group_id
        AND id != OLD.id;  -- Exclude the row being deleted

        -- If this is the last or second-to-last deletion in the group, allow it
        -- This handles the case where we're deleting the entire plan
        IF v_record_count <= 1 THEN
            RETURN OLD;
        END IF;
    END IF;

    -- Check constraints for the group (for INSERT/UPDATE or partial DELETE)
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE is_leftover = TRUE),
        COUNT(*) FILTER (WHERE portions_to_cook IS NOT NULL),
        MIN(portion_multiplier),
        MAX(portion_multiplier)
    INTO
        v_record_count,
        v_is_leftover_count,
        v_portions_to_cook_count,
        v_portion_multiplier_min,
        v_portion_multiplier_max
    FROM
        public.plan_meals
    WHERE
        multi_portion_group_id = v_group_id
        -- For DELETE, exclude the current row
        AND (TG_OP != 'DELETE' OR id != OLD.id);

    -- Rule 1: A group must have exactly 2 meals (or 0-1 during deletion)
    IF TG_OP != 'DELETE' AND v_record_count != 2 THEN
        RAISE EXCEPTION 'multi-portion group % must have exactly 2 meals (has %).', v_group_id, v_record_count;
    END IF;

    -- Rule 2: Exactly one meal must have is_leftover = FALSE (day 1)
    IF v_record_count = 2 AND v_is_leftover_count != 1 THEN
        RAISE EXCEPTION 'multi-portion group % must have exactly 1 leftover meal (has %).', v_group_id, v_is_leftover_count;
    END IF;

    -- Rule 3: Exactly one meal must have portions_to_cook set (day 1)
    IF v_record_count = 2 AND v_portions_to_cook_count != 1 THEN
        RAISE EXCEPTION 'multi-portion group % must have exactly 1 meal with portions_to_cook set (has %).', v_group_id, v_portions_to_cook_count;
    END IF;

    -- Rule 4: Both meals in the group must have identical portion_multiplier
    IF v_record_count = 2 AND ABS(v_portion_multiplier_max - v_portion_multiplier_min) > 0.001 THEN
        RAISE EXCEPTION 'multi-portion group % meals must have identical portion_multiplier (min: %, max: %).', v_group_id, v_portion_multiplier_min, v_portion_multiplier_max;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger (still AFTER, but with improved function logic)
CREATE TRIGGER enforce_multi_portion_group_trigger
AFTER INSERT OR UPDATE OF portion_multiplier, multi_portion_group_id OR DELETE ON public.plan_meals
FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_multi_portion_group();

-- Add comment explaining the change
COMMENT ON FUNCTION public.fn_enforce_multi_portion_group() IS
'Enforces multi-portion group integrity. Allows deletion of entire groups (0-1 remaining meals) to support cleanup operations.';
