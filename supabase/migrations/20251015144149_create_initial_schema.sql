-- migration: create_initial_schema
-- description: sets up the initial database schema including tables for recipes, plans, and user settings.
-- tables_affected: recipes, user_settings, plans, plan_days, plan_day_slot_targets, plan_meals
-- special_notes: this migration enables rls on all new tables and sets up triggers for data integrity.

-- enable extensions
-- pg_trgm is used for fuzzy string matching on recipe names.
create extension if not exists pg_trgm with schema extensions;

-- create custom types (enums)
-- these enums define allowed values for specific columns, ensuring data consistency.

create type public.meal_slot as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type public.meal_status as enum ('planned', 'completed', 'skipped');
create type public.plan_state as enum ('active', 'archived', 'cancelled');

-- create table: recipes
-- stores recipe information. recipes are considered public data and can be read by anyone.
create table public.recipes (
    id bigserial primary key,
    slug text not null unique,
    name text not null,
    portions integer not null default 1 check (portions >= 1),
    prep_minutes integer null check (prep_minutes is null or prep_minutes > 0),
    cook_minutes integer null check (cook_minutes is null or cook_minutes > 0),
    image_url text null,
    source_url text null,
    rating_avg numeric(3,2) null check (rating_avg is null or (rating_avg >= 0 and rating_avg <= 5)),
    reviews_count integer not null default 0 check (reviews_count >= 0),
    ingredients text[] not null default '{}'::text[],
    calories_kcal integer not null check (calories_kcal > 0),
    protein_g numeric(6,2) null check (protein_g is null or protein_g >= 0),
    fat_g numeric(6,2) null check (fat_g is null or fat_g >= 0),
    carbs_g numeric(6,2) null check (carbs_g is null or carbs_g >= 0),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- enable row level security for the recipes table
alter table public.recipes enable row level security;

-- create table: recipe_slots
-- links recipes to the meal slots they are suitable for (many-to-many).
create table public.recipe_slots (
    recipe_id bigint not null references public.recipes(id) on delete cascade,
    slot meal_slot not null,
    primary key (recipe_id, slot)
);

-- enable row level security for the recipe_slots table
alter table public.recipe_slots enable row level security;

-- create table: user_settings
-- stores user-specific settings, like default calorie targets.
create table public.user_settings (
    user_id uuid primary key references auth.users(id) on delete restrict,
    default_daily_calories integer not null check (default_daily_calories > 0),
    default_plan_length_days integer not null default 7 check (default_plan_length_days between 1 and 31),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- enable row level security for the user_settings table
alter table public.user_settings enable row level security;

-- create table: plans
-- stores meal plans for users. each user can have only one active plan.
create table public.plans (
    id bigserial primary key,
    user_id uuid not null references auth.users(id) on delete restrict,
    state plan_state not null default 'active',
    start_date date not null,
    end_date date not null check (end_date >= start_date),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- enable row level security for the plans table
alter table public.plans enable row level security;


-- create table: plan_days
-- represents a single day within a meal plan.
create table public.plan_days (
    id bigserial primary key,
    plan_id bigint not null references public.plans(id) on delete cascade,
    date date not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (plan_id, date)
);

-- enable row level security for the plan_days table
alter table public.plan_days enable row level security;

-- create table: plan_day_slot_targets
-- stores calorie targets for each meal slot of a plan day.
create table public.plan_day_slot_targets (
    id bigserial primary key,
    plan_day_id bigint not null references public.plan_days(id) on delete cascade,
    slot meal_slot not null,
    calories_target integer not null check (calories_target > 0),
    unique (plan_day_id, slot)
);

-- enable row level security for the plan_day_slot_targets table
alter table public.plan_day_slot_targets enable row level security;

-- create table: plan_meals
-- links recipes to specific meal slots in a plan day.
create table public.plan_meals (
    id bigserial primary key,
    plan_day_id bigint not null references public.plan_days(id) on delete cascade,
    -- denormalized columns for performance and simpler rls policies
    plan_id bigint not null,
    user_id uuid not null,
    slot meal_slot not null,
    status meal_status not null default 'planned',
    recipe_id bigint not null references public.recipes(id) on delete restrict,
    calories_planned integer not null check (calories_planned > 0),
    portion_multiplier numeric(4,2) not null default 1.00 check (portion_multiplier > 0),
    portions_to_cook integer null check (portions_to_cook is null or portions_to_cook > 0),
    multi_portion_group_id uuid null,
    is_leftover boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (plan_day_id, slot),
    check (multi_portion_group_id is null or slot in ('lunch','dinner')),
    check (is_leftover = false or multi_portion_group_id is not null),
    check (portions_to_cook is null or is_leftover = false),
    check (multi_portion_group_id is null or portions_to_cook is null or is_leftover = false)
);

-- enable row level security for the plan_meals table
alter table public.plan_meals enable row level security;


-- create indexes for performance
-- these indexes are created to speed up common queries.

-- index on recipes for search and filtering
create index recipes_calories_kcal_idx on public.recipes (calories_kcal);
create index recipes_name_gin_idx on public.recipes using gin (name extensions.gin_trgm_ops);
create index recipes_ingredients_gin_idx on public.recipes using gin (ingredients);

-- indexes on recipe_slots for efficient lookups
create index recipe_slots_slot_recipe_id_idx on public.recipe_slots (slot, recipe_id);

-- index on plans to enforce one active plan per user
create unique index plans_user_id_active_idx on public.plans (user_id) where (state = 'active');

-- index on plan_days for efficient lookups
create index plan_days_plan_id_date_idx on public.plan_days (plan_id, date);

-- indexes on plan_meals for common filtering patterns
create index plan_meals_plan_id_slot_status_idx on public.plan_meals (plan_id, slot, status);
create index plan_meals_multi_portion_group_id_idx on public.plan_meals (multi_portion_group_id);
create index plan_meals_plan_id_slot_planned_idx on public.plan_meals (plan_id, slot) where (status = 'planned');
create index plan_meals_portions_to_cook_idx on public.plan_meals (portions_to_cook) where (portions_to_cook is not null);


-- create trigger functions and triggers for data integrity

-- trigger function: fn_calculate_plan_meal_calories
-- automatically calculates calories_planned based on recipe calories and portion_multiplier.
-- formula: calories_planned = recipes.calories_kcal * portion_multiplier
create or replace function public.fn_calculate_plan_meal_calories()
returns trigger as $$
declare
    v_calories_per_portion integer;
begin
    -- get the calories per portion from the recipe
    select calories_kcal into v_calories_per_portion
    from public.recipes
    where id = new.recipe_id;

    if not found then
        raise exception 'recipe % not found', new.recipe_id;
    end if;

    -- calculate and set the planned calories
    new.calories_planned := (v_calories_per_portion * new.portion_multiplier)::integer;

    return new;
end;
$$ language plpgsql;

-- trigger: calculate_plan_meal_calories_trigger
-- executes before insert or update on plan_meals to calculate calories.
create trigger calculate_plan_meal_calories_trigger
before insert or update of recipe_id, portion_multiplier on public.plan_meals
for each row execute function public.fn_calculate_plan_meal_calories();


-- trigger function: fn_validate_portion_multiplier
-- ensures that portion_multiplier does not exceed the recipe's portions.
create or replace function public.fn_validate_portion_multiplier()
returns trigger as $$
declare
    v_portions integer;
begin
    -- get the portions from the recipe
    select portions into v_portions
    from public.recipes
    where id = new.recipe_id;

    if not found then
        raise exception 'recipe % not found', new.recipe_id;
    end if;

    -- validate that portion_multiplier does not exceed recipe portions
    if new.portion_multiplier > v_portions then
        raise exception 'portion_multiplier (%) cannot exceed recipe portions (%)', new.portion_multiplier, v_portions;
    end if;

    return new;
end;
$$ language plpgsql;

-- trigger: validate_portion_multiplier_trigger
-- executes before insert or update on plan_meals to validate portion_multiplier.
create trigger validate_portion_multiplier_trigger
before insert or update of recipe_id, portion_multiplier on public.plan_meals
for each row execute function public.fn_validate_portion_multiplier();


-- trigger function: fn_set_plan_meals_denorm
-- automatically populates denormalized plan_id and user_id in plan_meals.
create or replace function public.fn_set_plan_meals_denorm()
returns trigger as $$
declare
    v_plan_id bigint;
    v_user_id uuid;
begin
    -- get plan_id from the parent plan_days record
    select plan_id into v_plan_id from public.plan_days where id = new.plan_day_id;
    if not found then
        raise exception 'plan_day_id % not found in plan_days', new.plan_day_id;
    end if;

    -- get user_id from the parent plans record
    select user_id into v_user_id from public.plans where id = v_plan_id;
    if not found then
        raise exception 'plan_id % not found in plans', v_plan_id;
    end if;

    -- set the denormalized columns
    new.plan_id := v_plan_id;
    new.user_id := v_user_id;

    return new;
end;
$$ language plpgsql security definer;

-- trigger: set_plan_meals_denorm_trigger
-- executes before insert or update on plan_meals to run the denormalization function.
create trigger set_plan_meals_denorm_trigger
before insert or update of plan_day_id on public.plan_meals
for each row execute function public.fn_set_plan_meals_denorm();


-- trigger function: fn_validate_plan_meal_slot
-- ensures that a meal is assigned to a slot that is valid for the recipe.
create or replace function public.fn_validate_plan_meal_slot()
returns trigger as $$
begin
    -- check if the selected slot exists for the given recipe in recipe_slots
    if not exists (
        select 1
        from public.recipe_slots rs
        where rs.recipe_id = new.recipe_id and rs.slot = new.slot
    ) then
        raise exception 'recipe % is not valid for slot %', new.recipe_id, new.slot;
    end if;

    return new;
end;
$$ language plpgsql;

-- trigger: validate_plan_meal_slot_trigger
-- executes before insert or update on plan_meals to validate the meal slot.
create trigger validate_plan_meal_slot_trigger
before insert or update of recipe_id, slot on public.plan_meals
for each row execute function public.fn_validate_plan_meal_slot();


-- trigger function: fn_enforce_multi_portion_group
-- enforces business rules for multi-portion meals (e.g., leftovers).
-- v2: validates that both meals in a group have identical portion_multiplier
--     and that one is day 1 (portions_to_cook set) and one is day 2 (is_leftover true).
create or replace function public.fn_enforce_multi_portion_group()
returns trigger as $$
declare
    v_group_id uuid;
    v_record_count integer;
    v_is_leftover_count integer;
    v_portions_to_cook_count integer;
    v_portion_multiplier_min numeric;
    v_portion_multiplier_max numeric;
begin
    -- determine the group id to check
    if tg_op = 'DELETE' then
        v_group_id := old.multi_portion_group_id;
    else
        v_group_id := new.multi_portion_group_id;
    end if;

    -- if there is no group id, there's nothing to enforce
    if v_group_id is null then
        return null;
    end if;

    -- check constraints for the group
    select
        count(*),
        count(*) filter (where is_leftover = true),
        count(*) filter (where portions_to_cook is not null),
        min(portion_multiplier),
        max(portion_multiplier)
    into
        v_record_count,
        v_is_leftover_count,
        v_portions_to_cook_count,
        v_portion_multiplier_min,
        v_portion_multiplier_max
    from
        public.plan_meals
    where
        multi_portion_group_id = v_group_id;

    -- rule 1: a group must have exactly 2 meals
    if v_record_count != 2 then
        raise exception 'multi-portion group % must have exactly 2 meals (has %).', v_group_id, v_record_count;
    end if;

    -- rule 2: exactly one meal must have is_leftover = false (day 1)
    if v_is_leftover_count != 1 then
        raise exception 'multi-portion group % must have exactly 1 leftover meal (has %).', v_group_id, v_is_leftover_count;
    end if;

    -- rule 3: exactly one meal must have portions_to_cook set (day 1)
    if v_portions_to_cook_count != 1 then
        raise exception 'multi-portion group % must have exactly 1 meal with portions_to_cook set (has %).', v_group_id, v_portions_to_cook_count;
    end if;

    -- rule 4: both meals in the group must have identical portion_multiplier
    if abs(v_portion_multiplier_max - v_portion_multiplier_min) > 0.001 then
        raise exception 'multi-portion group % meals must have identical portion_multiplier (min: %, max: %).', v_group_id, v_portion_multiplier_min, v_portion_multiplier_max;
    end if;

    return null; -- result is ignored since this is an after trigger
end;
$$ language plpgsql;

-- trigger: enforce_multi_portion_group_trigger
-- executes after changes to plan_meals to validate multi-portion groups.
create trigger enforce_multi_portion_group_trigger
after insert or update of portion_multiplier, multi_portion_group_id or delete on public.plan_meals
for each row execute function public.fn_enforce_multi_portion_group();


-- rls policies
-- these policies restrict access to data based on user authentication and ownership.

-- policies for: recipes
-- anon users can read all recipes.
create policy "allow public read access to recipes" on public.recipes
for select to anon, authenticated using (true);
-- service_role can insert data for initialization
create policy "allow service role insert on recipes" on public.recipes
for insert to service_role with check (true);
-- authenticated users can manage their own recipes, assuming an ownership model (e.g., created_by column) would be added.
-- for now, we restrict modifications.
create policy "disallow insert on recipes" on public.recipes
for insert to anon, authenticated with check (false);
create policy "disallow update on recipes" on public.recipes
for update to anon, authenticated using (false);
create policy "disallow delete on recipes" on public.recipes
for delete to anon, authenticated using (false);


-- policies for: recipe_slots
-- anon and authenticated users can read all recipe_slots.
create policy "allow public read access to recipe_slots" on public.recipe_slots
for select to anon, authenticated using (true);
-- modifications are disallowed for now.
create policy "disallow insert on recipe_slots" on public.recipe_slots
for insert to anon, authenticated with check (false);
create policy "disallow update on recipe_slots" on public.recipe_slots
for update to anon, authenticated using (false);
create policy "disallow delete on recipe_slots" on public.recipe_slots
for delete to anon, authenticated using (false);


-- policies for: user_settings
-- users can only manage their own settings.
create policy "allow full access to own user_settings" on public.user_settings
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "disallow all for anon on user_settings" on public.user_settings
for all to anon using (false);


-- policies for: plans
-- users can only manage their own plans.
create policy "allow full access to own plans" on public.plans
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "disallow all for anon on plans" on public.plans
for all to anon using (false);


-- policies for: plan_days
-- users can manage plan_days that belong to their own plans.
create policy "allow full access to own plan_days" on public.plan_days
for all to authenticated
using (exists(select 1 from public.plans where plans.id = plan_days.plan_id and plans.user_id = auth.uid()))
with check (exists(select 1 from public.plans where plans.id = plan_days.plan_id and plans.user_id = auth.uid()));
create policy "disallow all for anon on plan_days" on public.plan_days
for all to anon using (false);


-- policies for: plan_day_slot_targets
-- users can manage targets for days that belong to their own plans.
create policy "allow full access to own plan_day_slot_targets" on public.plan_day_slot_targets
for all to authenticated
using (exists(select 1 from public.plan_days inner join public.plans on plans.id = plan_days.plan_id where plan_days.id = plan_day_slot_targets.plan_day_id and plans.user_id = auth.uid()))
with check (exists(select 1 from public.plan_days inner join public.plans on plans.id = plan_days.plan_id where plan_days.id = plan_day_slot_targets.plan_day_id and plans.user_id = auth.uid()));
create policy "disallow all for anon on plan_day_slot_targets" on public.plan_day_slot_targets
for all to anon using (false);


-- policies for: plan_meals
-- users can only manage meals within their own plans.
create policy "allow full access to own plan_meals" on public.plan_meals
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "disallow all for anon on plan_meals" on public.plan_meals
for all to anon using (false);

