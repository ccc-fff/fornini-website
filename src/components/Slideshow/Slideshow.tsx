'use client'

import { useCallback } from 'react'
import { useSwipeable } from 'react-swipeable'
import { useSlideshow, type Slide } from './useSlideshow'
import { SlideImage } from './SlideImage'
import { SlideVimeo } from './SlideVimeo'
import { ProgressBar } from './ProgressBar'

interface SlideshowProps {
  slides: Slide[]
  defaultDuration: number
  showProgressBar?: boolean
}

export function Slideshow({
  slides,
  defaultDuration,
  showProgressBar = true,
}: SlideshowProps) {
  const {
    currentIndex,
    progress,
    slideDurations,
    next,
    prev,
    isLooping,
  } = useSlideshow({
    slides,
    defaultDuration,
    autoPlay: true,
  })

  // Swipe pour mobile
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => next(),
    onSwipedRight: () => prev(),
    trackMouse: false,
    trackTouch: true,
    delta: 50,
  })

  // Click handler: clic = next
  const handleClick = useCallback(() => {
    next()
  }, [next])

  if (!slides || slides.length === 0) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center text-white/50">
        Aucun slide configuré
      </div>
    )
  }

  return (
    <div
      {...swipeHandlers}
      className="relative w-full h-screen bg-black overflow-hidden cursor-pointer"
      onClick={handleClick}
    >
      {/* Slides */}
      {slides.map((slide, index) => {
        const isActive = index === currentIndex

        if (slide._type === 'slideVimeo') {
          return (
            <SlideVimeo
              key={slide._key}
              slide={slide}
              isActive={isActive}
            />
          )
        }

        return (
          <SlideImage
            key={slide._key}
            slide={slide}
            isActive={isActive}
          />
        )
      })}

      {/* Barre de progression */}
      {showProgressBar && slides.length > 1 && (
        <ProgressBar
          slideDurations={slideDurations}
          currentIndex={currentIndex}
          currentProgress={progress}
          isLooping={isLooping}
        />
      )}
    </div>
  )
}
