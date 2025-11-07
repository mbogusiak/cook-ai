import { z } from "zod";

/**
 * Schema for validating recipe ID parameter from path
 * Ensures ID is a positive integer
 */
export const GetRecipeParamsSchema = z.object({
  id: z
    .string()
    .transform(Number)
    .pipe(z.number().int("Recipe ID must be an integer").positive("Recipe ID must be a positive integer")),
});

export type GetRecipeParams = z.infer<typeof GetRecipeParamsSchema>;

/**
 * Schema for validating GET /api/recipes query parameters
 * Supports filtering by slot, calorie range, search text, and pagination
 */
export const GetRecipesQuerySchema = z
  .object({
    slot: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
    min_calories: z.coerce.number().int().positive().optional(),
    max_calories: z.coerce.number().int().positive().optional(),
    search: z.string().trim().min(1).max(255).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .refine((data) => !data.min_calories || !data.max_calories || data.min_calories <= data.max_calories, {
    message: "min_calories must be less than or equal to max_calories",
    path: ["min_calories"],
  });

export type SearchRecipesParams = z.infer<typeof GetRecipesQuerySchema>;
