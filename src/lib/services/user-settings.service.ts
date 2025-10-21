import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserSettingsDTO, CreateUserSettingsCommand } from '../../types'
import type { Database } from '../../db/database.types'

/**
 * Zod schema for validating user settings creation request
 * Validates user_id (UUID string), default_daily_calories (required, positive integer)
 * and default_plan_length_days (optional, 1-31 range)
 */
export const createUserSettingsSchema = z.object({
  user_id: z.string()
    .uuid('user_id musi być poprawnym UUID'),
  default_daily_calories: z.number()
    .int('default_daily_calories musi być liczbą całkowitą')
    .positive('default_daily_calories musi być większe od 0'),
  default_plan_length_days: z.number()
    .int('default_plan_length_days musi być liczbą całkowitą')
    .min(1, 'Minimum 1 dzień')
    .max(31, 'Maksimum 31 dni')
    .optional()
})

export type CreateUserSettingsSchema = z.infer<typeof createUserSettingsSchema>

/**
 * Creates user settings
 * 
 * Performs the following steps:
 * 1. Validates input data against Zod schema (including user_id format)
 * 2. Checks if user already has settings (prevents duplicate creation)
 * 3. Inserts new settings into database
 * 4. Returns created settings as UserSettingsDTO
 * 
 * @param supabase - Supabase client instance
 * @param command - CreateUserSettingsCommand with user_id and preferences
 * @returns Created UserSettingsDTO or error details
 * @throws Error if database operation fails
 */
export async function createUserSettings(
  supabase: SupabaseClient<Database>,
  command: CreateUserSettingsCommand
): Promise<{ data?: UserSettingsDTO; error?: string; code?: string }> {
  // Step 1: Validate input against schema
  const validationResult = createUserSettingsSchema.safeParse(command)
  
  if (!validationResult.success) {
    return {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
    }
  }

  const validatedData = validationResult.data
  const userId = validatedData.user_id

  // Step 2: Check if user already has settings (conflict detection)
  const { data: existingSettings, error: checkError } = await supabase
    .from('user_settings')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (checkError) {
    console.error('Error checking existing settings:', {
      code: checkError.code,
      message: checkError.message,
      details: checkError
    })
    return {
      error: 'Database error while checking existing settings',
      code: 'INTERNAL_SERVER_ERROR'
    }
  }

  // If settings already exist, return conflict error
  if (existingSettings) {
    return {
      error: 'User settings already exist. Use PATCH /api/user-settings to update.',
      code: 'SETTINGS_ALREADY_EXIST'
    }
  }

  // Step 3: Insert new user settings
  const { data: createdSettings, error: insertError } = await supabase
    .from('user_settings')
    .insert({
      user_id: userId,
      default_daily_calories: validatedData.default_daily_calories,
      default_plan_length_days: validatedData.default_plan_length_days || 7
    })
    .select()
    .single()

  if (insertError) {
    console.error('Error creating user settings:', {
      code: insertError.code,
      message: insertError.message,
      details: insertError,
      userId,
      calories: validatedData.default_daily_calories,
      planLength: validatedData.default_plan_length_days || 7
    })
    return {
      error: 'Failed to create user settings',
      code: 'INTERNAL_SERVER_ERROR'
    }
  }

  // Step 4: Return created settings as DTO
  return {
    data: {
      user_id: createdSettings.user_id,
      default_daily_calories: createdSettings.default_daily_calories,
      default_plan_length_days: createdSettings.default_plan_length_days,
      created_at: createdSettings.created_at,
      updated_at: createdSettings.updated_at
    }
  }
}
