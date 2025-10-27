-- Migration: add_preparation_to_recipes
-- Description: Adds preparation steps field to recipes table
-- Tables affected: recipes

ALTER TABLE public.recipes
ADD COLUMN preparation text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.recipes.preparation IS 'Step-by-step cooking instructions';
