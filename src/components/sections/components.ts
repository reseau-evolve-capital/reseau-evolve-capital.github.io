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
import { HeroSection } from '@/components/about/sections/HeroSection'
import { StorySection } from '@/components/about/sections/StorySection'
import { MissionSection } from '@/components/about/sections/MissionSection'
import { StructureSection } from '@/components/about/sections/StructureSection'
import { ApproachSection } from '@/components/about/sections/ApproachSection'
import { TeamSection } from '@/components/about/sections/TeamSection'
import { JoinSection } from '@/components/about/sections/JoinSection'
import { ContactIntro } from './ContactIntro'
import { ContactFormSection } from '@/components/contact/sections/ContactFormSection'
import { ContactInfoSection } from '@/components/contact/sections/ContactInfoSection'
import { LegalPagePresentation } from '@/components/legal/LegalPagePresentation'

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
  'sections.about-hero': HeroSection,
  'sections.story': StorySection,
  'sections.mission': MissionSection,
  'sections.structure': StructureSection,
  'sections.approach': ApproachSection,
  'sections.team': TeamSection,
  'sections.join': JoinSection,
  'sections.contact-intro': ContactIntro,
  'sections.contact-form': ContactFormSection,
  'sections.contact-info': ContactInfoSection,
  'sections.legal': LegalPagePresentation,
} as Record<string, ComponentType<SectionProps<never>>>
