'use client'

import { useMemo } from 'react'
import type { Slide } from './useSlideshow'

interface SlideImageProps {
  slide: Slide
  isActive: boolean
}

function getPositionStyles(position: string = '22') {
  const x = Math.floor(parseInt(position) / 10)
  const y = parseInt(position) % 10

  let justifyContent = 'center'
  let alignItems = 'center'

  // Horizontal: 1=gauche, 2=centre, 3=droite
  if (x === 1) justifyContent = 'flex-start'
  else if (x === 2) justifyContent = 'center'
  else if (x === 3) justifyContent = 'flex-end'

  // Vertical: 1=haut, 2=centre, 3=bas
  if (y === 1) alignItems = 'flex-start'
  else if (y === 2) alignItems = 'center'
  else if (y === 3) alignItems = 'flex-end'

  return { justifyContent, alignItems }
}

export function SlideImage({ slide, isActive }: SlideImageProps) {
  const { image, alt, scale = 100, position = '22' } = slide
  const positionStyles = useMemo(() => getPositionStyles(position), [position])

  if (!image?.asset?.url) return null

  const lqip = image.asset.metadata?.lqip

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
        <img
          src={image.asset.url}
          alt={alt || ''}
          className="block select-none"
          style={{
            maxWidth: `${scale}%`,
            maxHeight: `${scale}%`,
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            ...(lqip && !isActive
              ? {
                  backgroundImage: `url(${lqip})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : {}),
          }}
          draggable={false}
        />
      </div>
    </div>
  )
}
