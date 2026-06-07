// Wrapper Brevo (EDI-006) — envoi de la newsletter « La Quote-Part ».
//
// SERVER-ONLY. La clé `BREVO_API_KEY` est lue côté serveur (header `api-key`) et n'est
// JAMAIS exposée au client : ce module ne doit être importé que depuis des routes API /
// Server Actions / Edge Functions. Aucun import React, aucun secret en dur.
//
// Deux familles d'appels :
//   - transactionnel `/v3/smtp/email` pour l'envoi de TEST (sujet préfixé « [TEST] ») ;
//   - `/v3/emailCampaigns` (+ `/sendNow`) pour la campagne réelle (envoi à une liste).
//
// Testable : `fetch` et la clé sont injectables (options) → tests unitaires avec fetch mocké.
// Réf : EDI-006, block-contract.md, docs Brevo API v3.

const BREVO_BASE = 'https://api.brevo.com/v3'

/** Émetteur d'un email Brevo (transactionnel ou campagne). */
export interface BrevoSender {
  name: string
  email: string
}

/** Dépendances injectables (tests). `apiKey` défaut = `process.env.BREVO_API_KEY`. */
export interface BrevoOptions {
  /** Implémentation `fetch` (défaut : global). Permet le mock en test. */
  fetch?: typeof fetch
  /** Clé API Brevo (défaut : `process.env.BREVO_API_KEY`). Server-only. */
  apiKey?: string
}

export interface SendTestEmailInput {
  html: string
  /** Sujet « nu » — il sera préfixé « [TEST] ». */
  subject: string
  sender: BrevoSender
  /** Destinataires du test. */
  to: string[]
}

export interface CreateCampaignInput {
  /** Nom interne (idempotence) — ex. `quote-part-n1`. */
  name: string
  subject: string
  sender: BrevoSender
  htmlContent: string
  /** Listes de diffusion Brevo (ids numériques). */
  listIds: number[]
}

/** Résumé d'une campagne telle que renvoyée par Brevo. */
export interface BrevoCampaign {
  id: number
  name: string
  status?: string
}

/** Préfixe imposé sur le sujet des envois de test. */
export const TEST_SUBJECT_PREFIX = '[TEST] '

/** Nom de campagne déterministe (idempotence) : `quote-part-n{numeroEdition}`. */
export function campaignName(numeroEdition: number): string {
  return `quote-part-n${numeroEdition}`
}

function resolveApiKey(options: BrevoOptions | undefined): string {
  const key = options?.apiKey ?? process.env.BREVO_API_KEY
  if (!key || key.trim() === '') {
    throw new Error('BREVO_API_KEY manquante (server-only).')
  }
  return key
}

function resolveFetch(options: BrevoOptions | undefined): typeof fetch {
  const f = options?.fetch ?? globalThis.fetch
  if (typeof f !== 'function') {
    throw new Error('fetch indisponible : fournir options.fetch.')
  }
  return f
}

async function brevoRequest<T>(
  path: string,
  init: { method: string; body?: unknown },
  options: BrevoOptions | undefined
): Promise<T> {
  const f = resolveFetch(options)
  const apiKey = resolveApiKey(options)
  const res = await f(`${BREVO_BASE}${path}`, {
    method: init.method,
    headers: {
      'api-key': apiKey,
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  if (!res.ok) {
    let detail = ''
    try {
      detail = await res.text()
    } catch {
      // ignore : le corps peut être vide / illisible.
    }
    throw new Error(`Brevo ${init.method} ${path} → ${res.status} ${detail}`.trim())
  }
  // 204 (sendNow) → pas de corps JSON.
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/**
 * Envoie un email de TEST (transactionnel). Le sujet est préfixé « [TEST] ».
 * Sert à valider le rendu avant l'envoi à la liste.
 */
export async function sendTestEmail(
  input: SendTestEmailInput,
  options?: BrevoOptions
): Promise<{ messageId?: string }> {
  const recipients = input.to.map((email) => ({ email })).filter((r) => r.email.trim() !== '')
  if (recipients.length === 0) {
    throw new Error('Aucun destinataire de test (NEWSLETTER_TEST_RECIPIENTS vide ?).')
  }
  return brevoRequest<{ messageId?: string }>(
    '/smtp/email',
    {
      method: 'POST',
      body: {
        sender: input.sender,
        to: recipients,
        subject: `${TEST_SUBJECT_PREFIX}${input.subject}`,
        htmlContent: input.html,
      },
    },
    options
  )
}

/**
 * Cherche une campagne par son nom EXACT (idempotence). Retourne la 1re correspondance
 * ou `null`. Brevo expose `?status=&type=classic` mais pas de filtre par nom : on liste
 * et on filtre côté serveur.
 */
export async function findCampaignByName(
  name: string,
  options?: BrevoOptions
): Promise<BrevoCampaign | null> {
  const data = await brevoRequest<{ campaigns?: BrevoCampaign[] }>(
    '/emailCampaigns?type=classic&limit=100',
    { method: 'GET' },
    options
  )
  const match = (data?.campaigns ?? []).find((c) => c.name === name)
  return match ?? null
}

/** Crée une campagne email (brouillon Brevo) ciblant `listIds`. */
export async function createCampaign(
  input: CreateCampaignInput,
  options?: BrevoOptions
): Promise<BrevoCampaign> {
  const data = await brevoRequest<{ id: number }>(
    '/emailCampaigns',
    {
      method: 'POST',
      body: {
        name: input.name,
        subject: input.subject,
        sender: input.sender,
        htmlContent: input.htmlContent,
        recipients: { listIds: input.listIds },
      },
    },
    options
  )
  return { id: data.id, name: input.name }
}

/** Déclenche l'envoi immédiat d'une campagne existante. */
export async function sendCampaignNow(id: number, options?: BrevoOptions): Promise<void> {
  await brevoRequest<void>(`/emailCampaigns/${id}/sendNow`, { method: 'POST' }, options)
}
