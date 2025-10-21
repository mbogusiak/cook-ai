# No-Repeat Meals Algorithm - Implementation Status

## Current Status: WORKING ✅

The algorithm successfully prevents recipe repetition within meal plans.

**Modified File**: `src/lib/services/plans.service.ts`

## Implemented Features

### Feature 1: No Recipe Repetition ✅
A recipe cannot appear more than once in a plan (except via fallback when no unique recipes available).

**Implementation:**
- Track `usedRecipeIds: Set<number>` throughout plan generation
- Pass this set to `selectRecipeWithFallback()` to exclude already-used recipes
- Each meal selection ensures no duplicate recipes

### Feature 2: Calorie Margin Escalation ✅
When selecting recipes:
1. **Level 1**: Use ±20% calorie margin + exclude already used recipes
2. **Level 2**: Use ±30% calorie margin + exclude already used recipes  
3. **Level 3**: Use ±30% calorie margin + allow recipe repetition (fallback)
4. **None**: Throw error if no recipes available at all

**Implementation:**
- `selectRecipeWithFallback()` implements three-level fallback
- Ensures filter never eliminates all recipes
- Gracefully handles edge cases

## Pending Implementation

### Feature 3: Multi-Portion Leftovers ⏳

**Status:** Disabled pending clarification

**Issue:** Database schema has constraints on `portion_multiplier` and `multi_portion_group_id` that require understanding of:
- What does `calories_kcal` represent? (per portion? per recipe?)
- How should `portion_multiplier` be calculated for leftovers?
- What is the intended semantics of `multi_portion_group_id`?

**Constraints that need to be satisfied:**
```sql
check (multi_portion_group_id is null or slot in ('lunch','dinner'))
check (is_leftover = false or multi_portion_group_id is not null)
-- Plus trigger: sum of portion_multiplier in group must = 1.0
```

**Current Approach:** 
- Multi-portion logic disabled (set `multi_portion_group_id = null` always)
- Leftovers never created (`is_leftover = false` always)
- This satisfies the constraint requirements

**To Enable:** Clarify semantics of `portions`, `calories_kcal`, and `portion_multiplier` in data model

## Test Results

### Test Plan: 3 Days × 4 Slots = 12 Meals

```
Total meals:      12
Unique recipes:   11
Repeated recipes: 1 (via fallback)
Leftovers:        0
```

**Interpretation:**
- ✅ No-repeat logic working (11/12 unique)
- ✅ Fallback working (1 repetition via ±30% margin)
- ⏳ Leftovers disabled (pending clarification)
