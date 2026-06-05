// Endpoint POST /api/auth/magic-link — envoie un lien magique Supabase à un email invité.
//
// Garde-fous (AUT-002) :
//   - validation du corps { email } (zod, format email) → 400
//   - vérification invitation via RPC email_is_invited (anon, SECURITY DEFINER) → 403
//   - rate limit Upstash : 5 requêtes / 10 min par IP — fail-open si Upstash absent
//   - envoi du lien via supabase.auth.signInWithOtp → 502 en cas d'échec
//   - succès : { sent: true }
//
// Réf : ARCHITECTURE.md §1, DATA_MODEL.md, CLAUDE.md (conventions auth).

import * as Sentry from '@sentry/nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@evolve/data'

import { defaultLocale, isLocale, LOCALE_COOKIE } from '@/i18n/config'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'

// Upstash fonctionne sur l'edge runtime, mais nodejs est le choix sûr par défaut.
export const runtime = 'nodejs'

const bodySchema = z.object({ email: z.string().email() })

function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') ?? 'unknown'
}

// Email = donnée personnelle : on n'envoie JAMAIS l'adresse en clair à Sentry. On ne
// remonte que le DOMAINE (utile pour diagnostiquer un souci SMTP/DNS) — jamais la partie locale.
function emailDomain(email: string): string {
  const at = email.lastIndexOf('@')
  return at >= 0 ? email.slice(at + 1) : 'unknown'
}

// L'origin pour emailRedirectTo ne doit JAMAIS provenir d'un header attaquant-contrôlé
// (risque d'open-redirect). On utilise la variable d'env publique, sinon le défaut dev.
function origin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'
}

export async function POST(request: Request): Promise<NextResponse> {
  // 1. Validation du corps.
  let email: string
  try {
    const json: unknown = await request.json()
    email = bodySchema.parse(json).email
  } catch {
    return NextResponse.json({ error: 'Email invalide.' }, { status: 400 })
  }

  // 2. Rate limit : 5 requêtes / 10 min par IP (fail-open géré par le helper).
  const rl = await checkRateLimit('magicLink', clientIp(request))
  if (!rl.allowed) {
    return rateLimitedResponse(rl.retryAfterSeconds)
  }

  // 3. Client Supabase serveur (session via cookies — cookies() est async en Next.js 16).
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  // Locale courante (cookie NEXT_LOCALE, FR par défaut) — alimente user_metadata.locale
  // pour que l'Auth Hook `send-email` rende l'email magic link dans la bonne langue (A8).
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value
  const locale = isLocale(localeCookie) ? localeCookie : defaultLocale

  // 4. Vérification invitation via le RPC email_is_invited (callable par anon, SECURITY DEFINER).
  // Une erreur infra du RPC ne doit JAMAIS être déguisée en 403 : on renvoie 500.
  const { data: invited, error: rpcError } = await supabase.rpc('email_is_invited', {
    p_email: email,
  })
  if (rpcError) {
    // Capture Sentry (no-op sans DSN). Pas d'email en clair : seulement le domaine.
    Sentry.captureException(rpcError, {
      tags: { endpoint: '/api/auth/magic-link', step: 'email_is_invited' },
      extra: { email_domain: emailDomain(email) },
    })
    return NextResponse.json({ error: "Erreur de vérification de l'email." }, { status: 500 })
  }
  if (!invited) {
    return NextResponse.json(
      { error: "Cet email n'est pas encore invité dans un club Evolve Capital." },
      { status: 403 }
    )
  }

  // 5. Envoi du lien magique via Supabase Auth.
  // `data.locale` est persisté dans user_metadata.locale → lu par l'Auth Hook
  // `send-email` en PROD pour localiser l'email (A8). Sans incidence en local
  // (le mailer natif + template statique FR ignorent ce metadata).
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin()}/login/verify`,
      shouldCreateUser: true,
      data: { locale },
    },
  })
  if (otpError) {
    // Capture Sentry (no-op sans DSN). Pas d'email en clair : seulement le domaine.
    Sentry.captureException(otpError, {
      tags: { endpoint: '/api/auth/magic-link', step: 'signInWithOtp' },
      extra: { email_domain: emailDomain(email) },
    })
    return NextResponse.json({ error: "Impossible d'envoyer le lien." }, { status: 502 })
  }

  return NextResponse.json({ sent: true })
}
