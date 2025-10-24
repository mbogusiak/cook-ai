/**
 * Main React component for Plan Overview
 * Manages state and logic for the view
 */

import { useState } from 'react'
import { PlanHeader } from './PlanHeader'
import { PlanCalendarStrip } from './PlanCalendarStrip'
import { DaysList } from './DaysList'
import { LoadingState } from './LoadingState'
import { ErrorState } from './ErrorState'
import { ConfirmDialog } from './ConfirmDialog'
import { usePlanOverview } from './usePlanOverview'
import { usePlanActions } from './usePlanActions'

interface PlanOverviewContentProps {
  planId: number
}

export function PlanOverviewContent({ planId }: PlanOverviewContentProps) {
  // Fetch plan data
  const { plan, isLoading, error, refetch } = usePlanOverview(planId)
  
  // Local state for confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'archive' | 'cancel' | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  
  // Plan actions
  const { archivePlan, cancelPlan, isArchiving, isCancelling } = usePlanActions(
    planId,
    () => {
      // On success callback
      refetch()
      setShowConfirmDialog(false)
      setConfirmAction(null)
      setIsConfirming(false)
    }
  )
  
  /**
   * Handles archive action - opens confirmation dialog
   */
  const handleArchive = () => {
    if (!plan) return
    
    if (plan.completionPercentage < 90) {
      // TODO: Add toast notification
      console.warn('Ukończ co najmniej 90% posiłków aby zarchiwizować plan')
      return
    }
    
    setConfirmAction('archive')
    setShowConfirmDialog(true)
  }
  
  /**
   * Handles cancel action - opens confirmation dialog
   */
  const handleCancel = () => {
    setConfirmAction('cancel')
    setShowConfirmDialog(true)
  }
  
  /**
   * Handles confirmation of archive/cancel action
   */
  const handleConfirm = async () => {
    if (!confirmAction) return
    
    setIsConfirming(true)
    
    try {
      if (confirmAction === 'archive') {
        await archivePlan()
      } else if (confirmAction === 'cancel') {
        await cancelPlan()
      }
      // Success callback will handle refetch and dialog close
    } catch (error) {
      // Error is already set in the hook
      console.error('Failed to update plan:', error)
      setIsConfirming(false)
      // Keep dialog open for retry
    }
  }
  
  /**
   * Handles dialog cancel
   */
  const handleDialogCancel = () => {
    setShowConfirmDialog(false)
    setConfirmAction(null)
    setIsConfirming(false)
  }
  
  // Loading state
  if (isLoading) {
    return <LoadingState />
  }
  
  // Error state
  if (error) {
    return <ErrorState error={error} onRetry={refetch} />
  }
  
  // No plan data
  if (!plan) {
    return (
      <ErrorState 
        error={{ status: 404, message: 'Plan nie został znaleziony' }} 
        onRetry={refetch}
      />
    )
  }
  
  // Main content
  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 animate-in fade-in duration-500">
      <PlanHeader 
        plan={plan}
        onArchive={handleArchive}
        onCancel={handleCancel}
      />
      
      <PlanCalendarStrip days={plan.days} />
      
      <DaysList days={plan.days} planId={plan.id} />
      
      <ConfirmDialog
        isOpen={showConfirmDialog}
        action={confirmAction}
        onConfirm={handleConfirm}
        onCancel={handleDialogCancel}
        isLoading={isConfirming || isArchiving || isCancelling}
      />
    </div>
  )
}

