import type { ClubDoc, GlobalDoc, Locale, SectionData } from '@/lib/content-types'
import { ContentError } from '@/lib/content'
import { isRenderable, type ContactInfo, type FeaturedClub, type RenderContext } from './registry'
import { SECTION_COMPONENTS } from './components'
import BlockRenderer from '@/components/editorial/BlockRenderer'
import type { EditorialBloc } from '@/lib/api'
import { imageUrl } from '@/lib/media'

type Input = { sections: SectionData[]; locale: Locale; clubs: ClubDoc[]; global: GlobalDoc }
export type RenderableSection = { section: SectionData; ctx: RenderContext }

// Sections effectivement rendues, avec leur contexte (partage avec la navigation de l'accueil).
export function renderableSections({ sections, locale, clubs, global }: Input): RenderableSection[] {
  const featured: FeaturedClub[] = clubs
    .filter((c) => c.featured)
    .map((c) => ({ slug: c.slug, name: c.name, description: c.description, members: c.members, location: c.location, coordinates: c.coordinates, image: imageUrl(c.image) }))
  const { contactEmail, contactPhone, contactAddress, linkedin, twitter, facebook, instagram } = global
  const contact: ContactInfo = { contactEmail, contactPhone, contactAddress, linkedin, twitter, facebook, instagram }
  const ctxFor = (component: string): RenderContext =>
    component === 'sections.featured-clubs' ? { locale, clubs: featured }
      : component === 'sections.contact-intro' || component === 'sections.contact-info' ? { locale, contact }
        : { locale }
  return sections.flatMap((section) => {
    const ctx = ctxFor(section.__component)
    return isRenderable(section, ctx) ? [{ section, ctx }] : []
  })
}

export const anchorIdOf = (section: SectionData) => ('anchorId' in section ? section.anchorId : null)

export function SectionRenderer({ items, locale }: { items: RenderableSection[]; locale: Locale }) {
  return (
    <>
      {items.map(({ section, ctx }) => {
        const key = `${section.__component}-${section.id}`
        if (section.__component.startsWith('blocs.')) {
          return (
            <div key={key} className="mx-auto max-w-3xl px-4">
              <BlockRenderer corps={[section as EditorialBloc]} locale={locale} />
            </div>
          )
        }
        const Component = SECTION_COMPONENTS[section.__component]
        // Type enregistre dans RULES sans composant : echec de build plutot qu'une section muette.
        if (!Component) throw new ContentError(`Section sans composant : ${section.__component}`)
        const anchorId = anchorIdOf(section)
        const node = <Component data={section as never} ctx={ctx} />
        return anchorId ? <section key={key} id={anchorId}>{node}</section> : <div key={key}>{node}</div>
      })}
    </>
  )
}
