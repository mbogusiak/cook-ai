/**
 * Error state component for Plan Overview
 * Displays error messages with retry option
 */

import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

interface ErrorStateProps {
  error: {
    status?: number
    message: string
  }
  onRetry?: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md space-y-4">
        <div className="flex justify-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">
            {error.status === 404 ? 'Nie znaleziono planu' : 'Wystąpił błąd'}
          </h2>
          <p className="text-muted-foreground">
            {error.message}
          </p>
        </div>

        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="mt-4">
            Spróbuj ponownie
          </Button>
        )}
      </div>
    </div>
  )
}
