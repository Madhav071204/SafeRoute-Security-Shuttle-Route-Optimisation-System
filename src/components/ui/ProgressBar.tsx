interface ProgressBarProps {
  value: number
  max: number
  label?: string
  showPercentage?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ProgressBar({
  value,
  max,
  label,
  showPercentage = true,
  size = 'md',
  className = '',
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  return (
    <div className={className}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1">
          {label && (
            <span className={`font-medium text-gray-700 ${textSizeClasses[size]}`}>{label}</span>
          )}
          {showPercentage && (
            <span className={`text-gray-500 ${textSizeClasses[size]}`}>{percentage}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`bg-primary-600 rounded-full transition-all duration-300 ${sizeClasses[size]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
