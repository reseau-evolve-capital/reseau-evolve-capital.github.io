'use server'

// Server Action envoi relance cotisation (T5 — cotisations V2).
//
// Envoie un email de relance de cotisation via l'API Brevo.
// Garde de sécurité : vérifie que l'utilisateur courant est trésorier+ dans le club
// passé en paramètre (resolveAdminContext + scoping au club actif).
//
// Pattern email : appel direct à l'API Brevo (même pattern que supabase/functions/send-email).
// V1 : log simple dans la console (pas de membre_access_events insert — prévu V2).
//
// Réf : T5 brief, CLAUDE.md (jamais service-role côté client, RLS staff, no any).

import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { resolveAdminContext } from '@/lib/data/admin'

/** Expéditeur transactionnel Brevo (miroir de supabase/functions/send-email/index.ts). */
const SENDER = {
  email: process.env['BREVO_SENDER_EMAIL'] ?? 'noreply@mail.evolve-capital.fr',
  name: 'Evolve Capital',
}

interface BrevoEmailPayload {
  to: { email: string; name?: string }[]
  subject: string
  htmlContent: string
  sender: { email: string; name: string }
}

async function sendBrevoEmail(payload: BrevoEmailPayload): Promise<void> {
  const apiKey = process.env['BREVO_API_KEY'] ?? ''
  if (apiKey === '') {
    throw new Error('BREVO_API_KEY manquante.')
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Brevo ${res.status}: ${detail}`)
  }
}

/**
 * Convertit un message texte en HTML basique (préserve les sauts de ligne).
 * Simple : les retours à la ligne deviennent des <br /> ; les paragraphes vides = <br />.
 */
function textToHtml(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      return escaped === '' ? '<br />' : `<p style="margin:0 0 4px 0">${escaped}</p>`
    })
    .join('\n')
}

/**
 * Envoie un email de relance de cotisation à un membre.
 *
 * Sécurité :
 *   - L'utilisateur courant doit être trésorier+ dans le club `clubId` passé en paramètre.
 *   - Vérification via `resolveAdminContext` (RLS + session cookie) → null si non autorisé.
 *   - Aucun service-role. Le `clubId` est re-vérifié côté DB (pas juste confié au client).
 */
export async function sendRelanceEmail(params: {
  membershipId: string
  memberEmail: string
  memberName: string
  message: string
  clubId: string
}): Promise<{ success: boolean; error?: string }> {
  const { membershipId, memberEmail, memberName, message, clubId } = params

  // 1. Authentification + garde staff.
  const supabase = createServerClient(await cookies())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'unauthorized' }

  // Le clubId est fourni par le parent (AdminContext côté serveur) — pas de fallback cookie.
  // La garde resolveAdminContext vérifie via la DB (RLS + session) que l'utilisateur est
  // bien trésorier+ dans ce club précis.
  if (clubId === '') {
    return { success: false, error: 'forbidden' }
  }

  // On vérifie que l'utilisateur est staff dans le club passé en paramètre (DB + RLS).
  const ctx = await resolveAdminContext(supabase, user.id, clubId)
  if (!ctx || ctx.clubId !== clubId) {
    return { success: false, error: 'forbidden' }
  }

  // 2. Validation basique.
  if (!memberEmail || memberEmail.trim() === '') {
    return { success: false, error: 'missing_email' }
  }
  if (!message || message.trim() === '') {
    return { success: false, error: 'missing_message' }
  }

  // 3. Envoi Brevo.
  try {
    await sendBrevoEmail({
      to: [{ email: memberEmail.trim(), name: memberName }],
      subject: 'Rappel de cotisation — Evolve Capital',
      htmlContent: `<div style="font-family:sans-serif;font-size:14px;color:inherit;">${textToHtml(message)}</div>`,
      sender: SENDER,
    })
  } catch (err) {
    console.error('[sendRelanceEmail] Brevo error:', err)
    return { success: false, error: 'send_failed' }
  }

  // 4. Log V1 (pas d'insert member_access_events — prévu V2).
  console.info('[sendRelanceEmail] relance envoyée', {
    membershipId,
    clubId,
    userId: user.id,
  })

  return { success: true }
}
