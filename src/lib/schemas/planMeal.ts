import { z } from "zod";

/**
 * Validation schema for SwapMealCommand
 * Validates input for POST /api/plan-meals/{id}/swap endpoint
 *
 * Rules:
 * - new_recipe_id: Must be a positive integer representing a valid recipe
 */
export const swapMealCommandSchema = z
  .object({
    new_recipe_id: z
      .number()
      .int("new_recipe_id must be a whole number")
      .positive("new_recipe_id must be a positive number"),
  })
  .strict();

export type SwapMealCommandInput = z.infer<typeof swapMealCommandSchema>;

/**
 * Validation schema for plan meal ID parameter
 * Validates URL parameter for /api/plan-meals/{id} endpoints
 *
 * Rules:
 * - id: Must be a valid positive integer
 * - Converts string to number for type safety
 */
export const planMealIdSchema = z.object({
  id: z
    .string()
    .transform((val) => Number(val))
    .pipe(z.number().int("Plan meal ID must be a whole number").positive("Plan meal ID must be a positive number")),
});

export type PlanMealIdInput = z.infer<typeof planMealIdSchema>;

/**
 * Validation schema for alternatives query parameters
 * Validates query parameters for GET /api/plan-meals/{id}/alternatives endpoint
 *
 * Rules:
 * - limit: Optional number of alternatives to return (default 3, max 10)
 */
export const alternativesQuerySchema = z.object({
  limit: z
    .string()
    .nullable()
    .optional()
    .default("3")
    .transform((val) => val || "3")
    .transform((val) => Number(val))
    .pipe(
      z
        .number()
        .int("Limit must be a whole number")
        .min(1, "Limit must be at least 1")
        .max(10, "Limit cannot exceed 10")
    ),
});

export type AlternativesQueryInput = z.infer<typeof alternativesQuerySchema>;
