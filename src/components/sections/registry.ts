import type { ClubDoc, GlobalDoc, Locale, SectionData } from '@/lib/content-types'

export type RenderContext = { locale: Locale; clubs: ClubDoc[]; global: GlobalDoc; isHome: boolean }

export const hasItems = (arr: unknown[] | null | undefined) => Array.isArray(arr) && arr.length > 0

type AnySection = SectionData & Record<string, unknown>

const RULES: Record<string, (s: AnySection, ctx: RenderContext) => boolean> = {
  'sections.home-hero': () => true,
  'sections.introduction': () => true,
  'sections.value-proposition': (s) => hasItems(s.benefits as unknown[]) || hasItems(s.testimonials as unknown[]),
  'sections.featured-clubs': (_s, ctx) => ctx.clubs.some((c) => c.featured),
  'sections.events': (s) => hasItems(s.events as unknown[]),
  'sections.media-resources': (s) => hasItems(s.resources as unknown[]),
  'sections.membership': (s) => hasItems(s.benefits as unknown[]) || hasItems(s.members as unknown[]) || hasItems(s.gallery as unknown[]),
  'sections.partnerships': (s) => hasItems(s.partners as unknown[]) || hasItems(s.sponsorshipTiers as unknown[]),
  'sections.about-hero': () => true,
  'sections.story': (s) => hasItems(s.timeline as unknown[]) || Boolean(s.genesisContent),
  'sections.mission': (s) => hasItems(s.values as unknown[]),
  'sections.structure': () => true,
  'sections.approach': () => true,
  'sections.team': (s) => hasItems(s.members as unknown[]),
  'sections.join': () => true,
  'sections.contact-intro': () => true,
  'sections.contact-form': (s) => hasItems(s.formFields as unknown[]),
  'sections.contact-info': () => true,
  'sections.legal': (s) => hasItems(s.body as unknown[]),
}

export function isRenderable(section: SectionData, ctx: RenderContext): boolean {
  if (section.__component.startsWith('blocs.')) return true
  const rule = RULES[section.__component]
  if (!rule) {
    console.warn(`[contenu] section inconnue ignorée : ${section.__component}`)
    return false
  }
  return rule(section as AnySection, ctx)
}
