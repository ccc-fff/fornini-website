'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface Slide {
  _key: string
  _type: 'slideImage' | 'slideVimeo'
  scale?: number
  position?: string
  duration?: number
  image?: {
    asset: {
      _id: string
      url: string
      metadata?: {
        lqip?: string
        dimensions?: { width: number; height: number }
      }
    }
    hotspot?: { x: number; y: number }
    crop?: { top: number; bottom: number; left: number; right: number }
  }
  alt?: string
  vimeoId?: string
}

interface UseSlideshowOptions {
  slides: Slide[]
  defaultDuration: number
  autoPlay?: boolean
}

interface UseSlideshowReturn {
  currentIndex: number
  currentSlide: Slide
  progress: number
  slideDurations: number[]
  goToSlide: (index: number) => void
  next: () => void
  prev: () => void
  pause: () => void
  resume: () => void
  isPaused: boolean
  isLooping: boolean
}

export function useSlideshow({
  slides,
  defaultDuration,
  autoPlay = true,
}: UseSlideshowOptions): UseSlideshowReturn {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(!autoPlay)
  const [isLooping, setIsLooping] = useState(false)

  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  // Calcul des durées pour chaque slide
  const slideDurations = slides.map(
    (slide) => slide.duration || defaultDuration
  )

  const currentDuration = slideDurations[currentIndex] || defaultDuration

  const next = useCallback(() => {
    const isGoingToLoop = currentIndex === slides.length - 1
    setIsLooping(isGoingToLoop)
    setCurrentIndex((prev) => (prev + 1) % slides.length)
    setProgress(0)
    startTimeRef.current = 0

    if (isGoingToLoop) {
      setTimeout(() => setIsLooping(false), 50)
    }
  }, [currentIndex, slides.length])

  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length)
    setProgress(0)
    startTimeRef.current = 0
  }, [slides.length])

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentIndex(index)
      setProgress(0)
      startTimeRef.current = 0
    }
  }, [slides.length])

  const pause = useCallback(() => {
    setIsPaused(true)
  }, [])

  const resume = useCallback(() => {
    setIsPaused(false)
    startTimeRef.current = 0
  }, [])

  // Animation loop avec RAF
  useEffect(() => {
    if (isPaused || slides.length <= 1) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      return
    }

    const animate = (timestamp: number) => {
      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp - (progress / 100) * currentDuration
      }

      const elapsed = timestamp - startTimeRef.current
      const newProgress = Math.min((elapsed / currentDuration) * 100, 100)

      setProgress(newProgress)

      if (newProgress >= 100) {
        next()
      } else {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [isPaused, currentIndex, currentDuration, slides.length, next])

  // Navigation clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault()
          next()
          break
        case 'ArrowLeft':
          e.preventDefault()
          prev()
          break
        case 'Escape':
          isPaused ? resume() : pause()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [next, prev, pause, resume, isPaused])

  return {
    currentIndex,
    currentSlide: slides[currentIndex],
    progress,
    slideDurations,
    goToSlide,
    next,
    prev,
    pause,
    resume,
    isPaused,
    isLooping,
  }
}
