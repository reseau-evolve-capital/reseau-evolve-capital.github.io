import type { SectionData } from '@/lib/content-types'
import { isRenderable, type RenderContext } from './registry'
import { SECTION_COMPONENTS } from './components'
import BlockRenderer from '@/components/editorial/BlockRenderer'
import type { EditorialBloc } from '@/lib/api'

export function SectionRenderer({ sections, ctx }: { sections: SectionData[]; ctx: RenderContext }) {
  return (
    <>
      {sections.filter((s) => isRenderable(s, ctx)).map((section) => {
        const key = `${section.__component}-${section.id}`
        if (section.__component.startsWith('blocs.')) {
          return (
            <div key={key} className="mx-auto max-w-3xl px-4">
              <BlockRenderer corps={[section as EditorialBloc]} locale={ctx.locale} />
            </div>
          )
        }
        const Component = SECTION_COMPONENTS[section.__component]
        if (!Component) return null
        const anchorId = 'anchorId' in section ? section.anchorId : null
        const node = <Component data={section as never} ctx={ctx} />
        return anchorId ? <section key={key} id={anchorId}>{node}</section> : <div key={key}>{node}</div>
      })}
    </>
  )
}
