/**
 * Custom hook for fetching and transforming plan data
 */

import { useState, useEffect } from 'react'
import type { PlanDetailsResponse } from '@/types'
import type { UsePlanOverviewResult, PlanOverviewViewModel, ApiError } from './types'
import { transformToPlanOverview } from './transforms'

export function usePlanOverview(planId: number): UsePlanOverviewResult {
  const [plan, setPlan] = useState<PlanOverviewViewModel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  const fetchPlan = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/plans/${planId}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw {
          status: response.status,
          message: errorText || `Failed to fetch plan: ${response.status}`
        }
      }
      
      const responseData: { data: PlanDetailsResponse } = await response.json()
      const viewModel = transformToPlanOverview(responseData.data)
      setPlan(viewModel)
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError)
      setPlan(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPlan()
  }, [planId])

  return { 
    plan, 
    isLoading, 
    error, 
    refetch: fetchPlan 
  }
}

