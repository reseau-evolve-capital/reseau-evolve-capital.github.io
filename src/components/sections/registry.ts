import type { ClubDoc, GlobalDoc, Locale, SectionData } from '@/lib/content-types'

// Seules les donnees utiles a une section entrent dans son payload RSC (sections client).
export type FeaturedClub = Pick<ClubDoc, 'slug' | 'name' | 'description' | 'members' | 'location' | 'coordinates'> & { image: string | null }
export type ContactInfo = Partial<Pick<GlobalDoc, 'contactEmail' | 'contactPhone' | 'contactAddress' | 'linkedin' | 'twitter' | 'facebook' | 'instagram'>>
export type RenderContext = { locale: Locale; clubs?: FeaturedClub[]; contact?: ContactInfo }

export const hasItems = (arr: unknown[] | null | undefined) => Array.isArray(arr) && arr.length > 0

type AnySection = SectionData & Record<string, unknown>

// Champs exiges par validateContactForm (lib/contact.ts) : sans eux le formulaire ne peut pas etre envoye.
const CONTACT_REQUIRED_FIELDS = ['name', 'email', 'subject', 'message']

export const RULES: Record<string, (s: AnySection, ctx: RenderContext) => boolean> = {
  'sections.home-hero': () => true,
  'sections.introduction': () => true,
  'sections.value-proposition': (s) => hasItems(s.benefits as unknown[]) || hasItems(s.testimonials as unknown[]),
  'sections.featured-clubs': (_s, ctx) => hasItems(ctx.clubs),
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
  'sections.contact-form': (s) => {
    const names = ((s.formFields as { name: string }[] | null) ?? []).map((f) => f.name)
    const missing = CONTACT_REQUIRED_FIELDS.filter((n) => !names.includes(n))
    if (missing.length) console.warn(`[contenu] formulaire de contact masque, champs requis absents : ${missing.join(', ')}`)
    return missing.length === 0
  },
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
