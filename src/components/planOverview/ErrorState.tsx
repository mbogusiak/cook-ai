/**
 * Error state with retry option
 */

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApiError } from './types'

interface ErrorStateProps {
  error: Error | ApiError
  onRetry?: () => void
}

/**
 * Returns appropriate error title based on error status
 */
function getErrorTitle(error: Error | ApiError): string {
  if ('status' in error) {
    switch (error.status) {
      case 404:
        return 'Plan nie znaleziony'
      case 403:
        return 'Brak dostępu'
      case 401:
        return 'Wymagane logowanie'
      case 500:
        return 'Wystąpił błąd'
      default:
        return 'Wystąpił błąd'
    }
  }
  return 'Wystąpił błąd'
}

/**
 * Returns appropriate error message based on error status
 */
function getErrorMessage(error: Error | ApiError): string {
  if ('status' in error) {
    switch (error.status) {
      case 404:
        return 'Plan o podanym ID nie istnieje lub został usunięty.'
      case 403:
        return 'Nie masz uprawnień do wyświetlenia tego planu.'
      case 401:
        return 'Twoja sesja wygasła. Zaloguj się ponownie.'
      case 500:
        return 'Nie udało się załadować planu. Spróbuj ponownie za chwilę.'
      default:
        return error.message || 'Wystąpił nieoczekiwany błąd.'
    }
  }
  return error.message || 'Wystąpił nieoczekiwany błąd.'
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const title = getErrorTitle(error)
  const message = getErrorMessage(error)

  return (
    <div 
      className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[400px] sm:min-h-[500px]"
      role="alert"
      aria-live="polite"
    >
      <div className="animate-in fade-in zoom-in duration-500">
        <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mb-4 mx-auto" />
      </div>
      <h2 className="text-xl sm:text-2xl font-bold mb-2 text-center">{title}</h2>
      <p className="text-sm sm:text-base text-muted-foreground mb-6 text-center max-w-md px-4">
        {message}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-sm px-4">
        {onRetry && (
          <Button 
            onClick={onRetry}
            className="w-full sm:w-auto transition-transform duration-200 hover:scale-105"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Spróbuj ponownie
          </Button>
        )}
        <Button 
          variant="outline" 
          asChild
          className="w-full sm:w-auto transition-transform duration-200 hover:scale-105"
        >
          <a href="/dashboard">Wróć do listy planów</a>
        </Button>
      </div>
    </div>
  )
}

