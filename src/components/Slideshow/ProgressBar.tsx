'use client'

interface ProgressBarProps {
  slideDurations: number[]
  currentIndex: number
  currentProgress: number
  isLooping: boolean
}

export function ProgressBar({
  slideDurations,
  currentIndex,
  currentProgress,
  isLooping,
}: ProgressBarProps) {
  const totalDuration = slideDurations.reduce((a, b) => a + b, 0)

  return (
    <div className="fixed bottom-0 left-0 w-full h-[2px] z-50 flex gap-[2px]">
      {slideDurations.map((duration, index) => {
        // Largeur proportionnelle à la durée
        const widthPercent = (duration / totalDuration) * 100

        // Calcul du remplissage
        let fillPercent = 0
        if (index < currentIndex) {
          fillPercent = 100
        } else if (index === currentIndex) {
          fillPercent = currentProgress
        }

        return (
          <div
            key={index}
            className="h-full bg-white/30 relative overflow-hidden"
            style={{ width: `${widthPercent}%` }}
          >
            <div
              className="h-full bg-white"
              style={{
                width: `${fillPercent}%`,
                transition: isLooping
                  ? 'none'
                  : index === currentIndex
                    ? 'none'
                    : 'width 0.3s ease',
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
