import { z } from "zod";

/**
 * Schema for login form validation
 */
export const loginSchema = z.object({
  email: z
    .string({
      required_error: "Email jest wymagany",
    })
    .email({
      message: "Nieprawidłowy format email",
    }),
  password: z
    .string({
      required_error: "Hasło jest wymagane",
    })
    .min(1, {
      message: "Hasło jest wymagane",
    }),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Schema for registration form validation
 */
export const registerSchema = z
  .object({
    email: z
      .string({
        required_error: "Email jest wymagany",
      })
      .email({
        message: "Nieprawidłowy format email",
      }),
    password: z
      .string({
        required_error: "Hasło jest wymagane",
      })
      .min(6, {
        message: "Hasło musi mieć co najmniej 6 znaków",
      }),
    confirmPassword: z
      .string({
        required_error: "Potwierdzenie hasła jest wymagane",
      })
      .min(1, {
        message: "Potwierdzenie hasła jest wymagane",
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

/**
 * Schema for registration API endpoint validation
 * (without confirmPassword - that's only for client-side form validation)
 */
export const registerApiSchema = z.object({
  email: z
    .string({
      required_error: "Email jest wymagany",
    })
    .email({
      message: "Nieprawidłowy format email",
    }),
  password: z
    .string({
      required_error: "Hasło jest wymagane",
    })
    .min(6, {
      message: "Hasło musi mieć co najmniej 6 znaków",
    }),
});

export type RegisterApiValues = z.infer<typeof registerApiSchema>;

/**
 * Schema for password reset request form validation
 */
export const resetRequestSchema = z.object({
  email: z
    .string({
      required_error: "Email jest wymagany",
    })
    .email({
      message: "Nieprawidłowy format email",
    }),
});

export type ResetRequestFormValues = z.infer<typeof resetRequestSchema>;

/**
 * Schema for password reset confirmation form validation
 */
export const resetConfirmSchema = z
  .object({
    password: z
      .string({
        required_error: "Hasło jest wymagane",
      })
      .min(6, {
        message: "Hasło musi mieć co najmniej 6 znaków",
      }),
    confirmPassword: z
      .string({
        required_error: "Potwierdzenie hasła jest wymagane",
      })
      .min(1, {
        message: "Potwierdzenie hasła jest wymagane",
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

export type ResetConfirmFormValues = z.infer<typeof resetConfirmSchema>;
