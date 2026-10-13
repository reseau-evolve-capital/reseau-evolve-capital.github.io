import { Suspense, createElement, type ComponentType } from 'react'
import type { RenderContext } from './registry'
import { HomeHero } from './HomeHero'
import { Introduction } from './Introduction'
import { ValueProposition } from './ValueProposition'
import { Events } from './Events'
import { MediaResources } from './MediaResources'
import { Membership } from './Membership'
import { Partnerships } from './Partnerships'
import { FeaturedClubs } from './FeaturedClubsLazy'

export type SectionProps<T> = { data: T; ctx: RenderContext }

export const SECTION_COMPONENTS = {
  'sections.home-hero': HomeHero,
  'sections.introduction': Introduction,
  'sections.value-proposition': ValueProposition,
  'sections.featured-clubs': FeaturedClubs,
  'sections.events': Events,
  'sections.media-resources': (props: SectionProps<never>) =>
    createElement(Suspense, null, createElement(MediaResources, props)),
  'sections.membership': Membership,
  'sections.partnerships': Partnerships,
} as Record<string, ComponentType<SectionProps<never>>>
