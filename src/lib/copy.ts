import type { Locale } from './content-types'

export const copy: Record<Locale, Record<string, string>> = {
  fr: {
    members: 'membres',
    learnMore: 'En savoir plus →',
    eventSummary: 'Voir le résumé',
    register: "S'inscrire",
    eventPast: 'Événement passé',
    participants: 'participants',
  },
  en: {
    members: 'members',
    learnMore: 'Learn more →',
    eventSummary: 'See summary',
    register: 'Register',
    eventPast: 'Past event',
    participants: 'participants',
  },
}
