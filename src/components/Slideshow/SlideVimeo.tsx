'use client'

import { useEffect, useRef, useMemo } from 'react'
import Player from '@vimeo/player'
import type { Slide } from './useSlideshow'

interface SlideVimeoProps {
  slide: Slide
  isActive: boolean
  onVideoEnd?: () => void
}

function getPositionStyles(position: string = '22') {
  const x = Math.floor(parseInt(position) / 10)
  const y = parseInt(position) % 10

  let justifyContent = 'center'
  let alignItems = 'center'

  if (x === 1) justifyContent = 'flex-start'
  else if (x === 2) justifyContent = 'center'
  else if (x === 3) justifyContent = 'flex-end'

  if (y === 1) alignItems = 'flex-start'
  else if (y === 2) alignItems = 'center'
  else if (y === 3) alignItems = 'flex-end'

  return { justifyContent, alignItems }
}

export function SlideVimeo({ slide, isActive, onVideoEnd }: SlideVimeoProps) {
  const { vimeoId, scale = 100, position = '22' } = slide
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<Player | null>(null)
  const positionStyles = useMemo(() => getPositionStyles(position), [position])

  useEffect(() => {
    if (!containerRef.current || !vimeoId) return

    // Créer le player Vimeo
    playerRef.current = new Player(containerRef.current, {
      id: parseInt(vimeoId),
      autoplay: false,
      muted: true,
      loop: true,
      background: true,
      controls: false,
    })

    playerRef.current.on('ended', () => {
      onVideoEnd?.()
    })

    return () => {
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [vimeoId, onVideoEnd])

  // Play/pause selon l'état actif
  useEffect(() => {
    if (!playerRef.current) return

    if (isActive) {
      playerRef.current.play().catch(() => {
        // Autoplay peut échouer, c'est normal
      })
    } else {
      playerRef.current.pause()
      playerRef.current.setCurrentTime(0)
    }
  }, [isActive])

  if (!vimeoId) return null

  return (
    <div
      className="absolute inset-0 w-full h-full transition-opacity duration-600 ease-in-out"
      style={{
        opacity: isActive ? 1 : 0,
        pointerEvents: isActive ? 'auto' : 'none',
      }}
    >
      <div
        className="absolute inset-0 flex"
        style={{
          justifyContent: positionStyles.justifyContent,
          alignItems: positionStyles.alignItems,
        }}
      >
        <div
          className="relative"
          style={{
            width: `${scale}%`,
            paddingBottom: `${(56.25 * scale) / 100}%`, // 16:9 ratio
          }}
        >
          <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    </div>
  )
}
