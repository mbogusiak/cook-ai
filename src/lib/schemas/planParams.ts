import { z } from 'zod'

/**
 * Schema for validating plan ID path parameter
 * Used in GET /api/plans/{id} endpoint
 */
export const planIdParamSchema = z.object({
  id: z.coerce.number().int().positive({
    message: 'Plan ID must be a positive integer',
  }),
})

export type PlanIdParam = z.infer<typeof planIdParamSchema>


