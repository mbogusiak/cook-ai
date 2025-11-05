-- Manual cleanup script for E2E test data
-- Run this in Supabase SQL Editor to clean up orphaned test data
-- This bypasses the multi-portion group trigger issues

-- Replace with your actual test user ID from .env.test
-- Current test user: 2d58b2c7-d4a0-47e8-8bb4-f4cd14f73d09

-- Step 1: Temporarily disable the trigger
ALTER TABLE plan_meals DISABLE TRIGGER enforce_multi_portion_group_trigger;

-- Step 2: Delete all test data
DELETE FROM plan_meals WHERE user_id = '2d58b2c7-d4a0-47e8-8bb4-f4cd14f73d09';
DELETE FROM plan_day_slot_targets
WHERE plan_day_id IN (
  SELECT pd.id FROM plan_days pd
  JOIN plans p ON p.id = pd.plan_id
  WHERE p.user_id = '2d58b2c7-d4a0-47e8-8bb4-f4cd14f73d09'
);
DELETE FROM plan_days
WHERE plan_id IN (
  SELECT id FROM plans WHERE user_id = '2d58b2c7-d4a0-47e8-8bb4-f4cd14f73d09'
);
DELETE FROM plans WHERE user_id = '2d58b2c7-d4a0-47e8-8bb4-f4cd14f73d09';

-- Step 3: Re-enable the trigger
ALTER TABLE plan_meals ENABLE TRIGGER enforce_multi_portion_group_trigger;

-- Verify cleanup
SELECT COUNT(*) as remaining_plans FROM plans WHERE user_id = '2d58b2c7-d4a0-47e8-8bb4-f4cd14f73d09';
SELECT COUNT(*) as remaining_meals FROM plan_meals WHERE user_id = '2d58b2c7-d4a0-47e8-8bb4-f4cd14f73d09';
