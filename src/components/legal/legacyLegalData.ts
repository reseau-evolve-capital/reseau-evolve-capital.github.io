import { legalConfig } from '@/config/legal-config'
import type { LegalSection } from '@/lib/content-types'

// Transitoire : supprime en B8 avec les routes legal legacy. Les balises HTML du legacy sont retirees (le gras est perdu).
export function legacyLegalData(locale: 'fr' | 'en', pageType: 'privacyPolicy' | 'termsOfService'): LegalSection {
  const page = legalConfig[pageType]
  const text = (t: string) => ({ type: 'text', text: t.replace(/<[^>]+>/g, '') })
  return {
    __component: 'sections.legal', id: 0, anchorId: null,
    title: page.title[locale], lastUpdated: page.lastUpdated,
    body: page.sections.flatMap((s) => [
      { type: 'heading', level: 2, children: [text(s.title[locale])] },
      ...s.content.map((p) => ({ type: 'paragraph', children: [text(p[locale])] })),
    ]),
  }
}
