/**
 * Maps Supabase Auth errors to user-friendly Polish messages
 * Used in API endpoints to provide consistent error messaging
 */

export interface AuthErrorResponse {
  message: string
  code?: string
}

/**
 * Maps Supabase Auth error messages to user-friendly Polish messages
 * 
 * @param error - Supabase Auth error (from auth.signInWithPassword, auth.signUp, etc.)
 * @returns User-friendly error message in Polish
 */
export function mapSupabaseAuthError(error: { message: string; status?: number }): AuthErrorResponse {
  const errorMessage = error.message.toLowerCase()
  const status = error.status

  // Invalid login credentials
  if (
    errorMessage.includes('invalid login credentials') ||
    errorMessage.includes('invalid email or password') ||
    errorMessage.includes('email not confirmed') ||
    status === 400
  ) {
    return {
      message: 'Nieprawidłowy email lub hasło',
      code: 'INVALID_CREDENTIALS'
    }
  }

  // User already exists
  if (
    errorMessage.includes('user already registered') ||
    errorMessage.includes('email already registered') ||
    errorMessage.includes('already been registered')
  ) {
    return {
      message: 'Ten adres email jest już zarejestrowany',
      code: 'EMAIL_EXISTS'
    }
  }

  // Weak password
  if (
    errorMessage.includes('password should be at least') ||
    errorMessage.includes('password is too weak') ||
    errorMessage.includes('password too short')
  ) {
    return {
      message: 'Hasło jest zbyt słabe. Wymagane minimum 8 znaków',
      code: 'WEAK_PASSWORD'
    }
  }

  // Invalid email format
  if (
    errorMessage.includes('invalid email') ||
    errorMessage.includes('email format is invalid')
  ) {
    return {
      message: 'Nieprawidłowy format adresu email',
      code: 'INVALID_EMAIL'
    }
  }

  // Too many requests
  if (
    errorMessage.includes('too many requests') ||
    errorMessage.includes('rate limit') ||
    status === 429
  ) {
    return {
      message: 'Zbyt wiele prób. Spróbuj ponownie za chwilę',
      code: 'RATE_LIMIT'
    }
  }

  // Token expired or invalid
  if (
    errorMessage.includes('token') &&
    (errorMessage.includes('expired') || errorMessage.includes('invalid'))
  ) {
    return {
      message: 'Link wygasł lub jest nieprawidłowy',
      code: 'INVALID_TOKEN'
    }
  }

  // Session expired
  if (
    errorMessage.includes('session') &&
    (errorMessage.includes('expired') || errorMessage.includes('invalid'))
  ) {
    return {
      message: 'Sesja wygasła. Zaloguj się ponownie',
      code: 'SESSION_EXPIRED'
    }
  }

  // User not found
  if (
    errorMessage.includes('user not found') ||
    errorMessage.includes('no user found')
  ) {
    return {
      message: 'Nie znaleziono użytkownika z tym adresem email',
      code: 'USER_NOT_FOUND'
    }
  }

  // Network or server errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    status === 500 ||
    status === 502 ||
    status === 503
  ) {
    return {
      message: 'Wystąpił błąd połączenia. Spróbuj ponownie za chwilę',
      code: 'NETWORK_ERROR'
    }
  }

  // Generic fallback
  return {
    message: 'Wystąpił błąd podczas uwierzytelniania. Spróbuj ponownie',
    code: 'UNKNOWN_ERROR'
  }
}


