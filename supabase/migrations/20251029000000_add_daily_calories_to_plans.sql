-- migration: add_daily_calories_to_plans
-- description: adds daily_calories column to plans table to store the target daily calorie intake for the plan
-- tables_affected: plans
-- special_notes: this column stores the original daily_calories parameter used to generate the plan

-- add daily_calories column to plans table
alter table public.plans
add column daily_calories integer not null default 2000 check (daily_calories > 0);

-- add comment to explain the column
comment on column public.plans.daily_calories is 'Target daily calorie intake used to generate this plan. Stored for reference and display purposes.';