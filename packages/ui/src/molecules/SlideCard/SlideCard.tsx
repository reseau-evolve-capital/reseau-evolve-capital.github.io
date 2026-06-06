import * as React from 'react'
import { Heading } from '../../atoms/Heading'
import { Text } from '../../atoms/Text'
import { cn } from '../../lib/cn'

export interface SlideCardProps {
  /** URL de l'image illustrative */
  imageSrc: string
  /** Texte alt de l'image */
  imageAlt: string
  /** Titre de la slide */
  title: string
  /** Corps de texte descriptif */
  body: string
  className?: string
}

/** Carte de slide pour un carrousel d'onboarding. Composant non-interactif. */
export function SlideCard({ imageSrc, imageAlt, title, body, className }: SlideCardProps) {
  return (
    <div
      className={cn(
        'flex w-full shrink-0 snap-center flex-col items-center gap-4 px-6 text-center',
        className
      )}
    >
      <img src={imageSrc} alt={imageAlt} className="h-40 w-auto" />
      <Heading level="h3">{title}</Heading>
      <Text variant="body" color="text-sec" as="p" className="max-w-prose">
        {body}
      </Text>
    </div>
  )
}
