import { z } from "zod";

/**
 * Validation schema for GET /api/plans/{plan_id}/days/{date}
 * - plan_id: positive integer parsed from string
 * - date: ISO yyyy-mm-dd string
 */
export const getPlanDayParamsSchema = z
  .object({
    plan_id: z
      .string()
      .transform((val) => Number(val))
      .pipe(z.number().int("plan_id must be a whole number").positive("plan_id must be a positive number")),
    date: z.string().refine((value) => {
      // Basic YYYY-MM-DD check and valid date
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const parsed = new Date(value);
      if (isNaN(parsed.getTime())) return false;
      // Ensure the string matches the date components (avoid timezone slop)
      const [y, m, d] = value.split("-").map((v) => Number(v));
      return parsed.getUTCFullYear() === y && parsed.getUTCMonth() + 1 === m && parsed.getUTCDate() === d;
    }, "date must be a valid ISO date (YYYY-MM-DD)"),
  })
  .strict();

export type GetPlanDayParams = z.infer<typeof getPlanDayParamsSchema>;
