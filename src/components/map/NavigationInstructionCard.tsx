'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ActiveNavigationState, Stop } from '@/types'
import {
  getManeuverIcon,
  formatManeuverDistance,
  formatDurationSeconds,
} from '@/lib/directions'
import clsx from 'clsx'

interface NavigationInstructionCardProps {
  navigation: ActiveNavigationState
  currentStop: Stop | null
  stopNumber: number
  totalStops: number
  isExpanded?: boolean
}

export function NavigationInstructionCard({
  navigation,
  currentStop,
  stopNumber,
  totalStops,
  isExpanded = false,
}: NavigationInstructionCardProps) {
  const { route, currentStepIndex, distanceToNextManeuver, distanceToDestination, etaToDestination, isRecalculating, isOffRoute } = navigation

  if (!route || route.steps.length === 0) {
    return null
  }

  const currentStep = route.steps[currentStepIndex]
  const nextStep = currentStepIndex + 1 < route.steps.length
    ? route.steps[currentStepIndex + 1]
    : null

  const maneuverIcon = currentStep
    ? getManeuverIcon(currentStep.maneuverType, currentStep.modifier)
    : '↑'

  const distanceDisplay = distanceToNextManeuver !== null
    ? formatManeuverDistance(distanceToNextManeuver)
    : formatManeuverDistance(currentStep?.distance || 0)

  return (
    <div className="px-4 sm:px-5 pb-3">
      {/* Recalculating or Off-Route Banner */}
      <AnimatePresence>
        {(isRecalculating || isOffRoute) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3"
          >
            <div className={clsx(
              'rounded-xl px-3 py-2 flex items-center gap-2',
              isOffRoute
                ? 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300'
                : 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
            )}>
              {isRecalculating ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">Recalculating route...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm font-medium">Off route - recalculating...</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Instruction */}
      <motion.div
        key={`step-${currentStepIndex}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 rounded-2xl p-4 text-white shadow-lg shadow-primary-500/20"
      >
        <div className="flex items-start gap-3">
          {/* Maneuver Icon */}
          <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">{maneuverIcon}</span>
          </div>

          <div className="flex-1 min-w-0">
            {/* Distance to next maneuver */}
            <div className="text-2xl sm:text-3xl font-bold leading-tight">
              {distanceDisplay}
            </div>

            {/* Instruction text */}
            <p className="text-sm sm:text-base text-white/90 mt-1 line-clamp-2 leading-snug">
              {currentStep?.instruction || 'Continue on route'}
            </p>

            {/* Road name */}
            {currentStep?.roadName && currentStep.roadName !== '' && (
              <p className="text-xs text-white/70 mt-0.5 truncate">
                {currentStep.roadName}
              </p>
            )}
          </div>
        </div>

        {/* Next instruction preview */}
        {nextStep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-3 pt-3 border-t border-white/20 flex items-center gap-2"
          >
            <span className="text-lg opacity-75">
              {getManeuverIcon(nextStep.maneuverType, nextStep.modifier)}
            </span>
            <span className="text-xs text-white/75">
              Then: {nextStep.instruction.length > 40
                ? nextStep.instruction.substring(0, 40) + '...'
                : nextStep.instruction}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Destination Info */}
      <div className="mt-3 flex items-center justify-between">
        {/* Current destination */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{stopNumber}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Stop {stopNumber} of {totalStops}
            </p>
            <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
              {currentStop?.passengerName || `Passenger ${stopNumber}`}
            </p>
          </div>
        </div>

        {/* ETA and Distance to destination */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {distanceToDestination !== null && (
            <div className="text-right">
              <p className="text-xs text-surface-500 dark:text-surface-400">Distance</p>
              <p className="text-sm font-semibold text-surface-900 dark:text-white">
                {formatManeuverDistance(distanceToDestination)}
              </p>
            </div>
          )}
          {etaToDestination !== null && (
            <div className="text-right pl-3 border-l border-surface-200 dark:border-surface-700">
              <p className="text-xs text-surface-500 dark:text-surface-400">ETA</p>
              <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                {formatDurationSeconds(etaToDestination)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Current stop address (when expanded) */}
      <AnimatePresence>
        {isExpanded && currentStop && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden"
          >
            <p className="text-xs text-surface-500 dark:text-surface-400 px-1">
              {currentStop.address}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
