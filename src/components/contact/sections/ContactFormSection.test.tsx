import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ContactFormSection } from './ContactFormSection'
import type { ContactFormSection as ContactFormData, Locale } from '@/lib/content-types'

const fixture = (
  labels: { name: string; email: string; subject: string; message: string },
  options: [string, string, string, string],
): ContactFormData => ({
  __component: 'sections.contact-form', id: 1, anchorId: null, title: 'T', submitLabel: 'Envoyer',
  formFields: [
    { name: 'name', label: labels.name, type: 'text', required: true, options: [] },
    { name: 'email', label: labels.email, type: 'email', required: true, options: [] },
    {
      name: 'subject', label: labels.subject, type: 'select', required: true,
      options: ['join-a-club', 'propose-a-partnership', 'request-information', 'other'].map((value, i) => ({ value, label: options[i] as string })),
    },
    { name: 'message', label: labels.message, type: 'textarea', required: true, options: [] },
  ],
})

const cases: [Locale, ContactFormData][] = [
  ['fr', fixture({ name: 'Nom', email: 'Adresse e-mail', subject: 'Objet', message: 'Votre message' }, ['Rejoindre un club', 'Proposer un partenariat', 'Demander des informations', 'Autre'])],
  ['en', fixture({ name: 'Name', email: 'Email address', subject: 'Subject', message: 'Your message' }, ['Join a club', 'Propose a partnership', 'Request information', 'Other'])],
]

describe('ContactFormSection', () => {
  it.each(cases)('rend les memes name et value que la vitrine actuelle (%s)', (locale, data) => {
    const ctx = { locale, clubs: [], global: {} as never, isHome: false }
    const html = renderToStaticMarkup(<ContactFormSection data={data} ctx={ctx} />)
    const names = [...html.matchAll(/<(?:input|select|textarea)[^>]*? name="([^"]+)"/g)].map((m) => m[1])
    expect(names).toEqual(['name', 'email', 'subject', 'message', 'newsletter'])
    const values = [...html.matchAll(/<option value="([^"]*)"/g)].map((m) => m[1])
    expect(values).toEqual(['join-a-club', 'propose-a-partnership', 'request-information', 'other'])
    expect(html).not.toMatch(/undefined|NaN/)
  })
})
