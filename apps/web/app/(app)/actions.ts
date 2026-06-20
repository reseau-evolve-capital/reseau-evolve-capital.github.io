'use server'
// Server Actions pour le groupe (app) — actions transversales au chrome applicatif.
//
// `setActiveClub` : pose le cookie de préférence de club actif. Sécurisé : on vérifie
// que le user a bien une adhésion active au club demandé avant de poser le cookie
// (sinon refus silencieux). Jamais de service-role : tout passe par la RLS.

import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { getSessionUser, ACTIVE_CLUB_COOKIE } from '@/lib/data/request'

/**
 * Pose le cookie `evolve_active_club` après vérification que le user a bien une
 * adhésion active au club `clubId`. Renvoie `{ ok: true }` en cas de succès,
 * `{ ok: false }` si le club est invalide ou l'utilisateur non autorisé.
 */
export async function setActiveClub(clubId: string): Promise<{ ok: boolean }> {
  const user = await getSessionUser()
  if (!user) return { ok: false }

  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  // Vérification : adhésion active à ce club (RLS appliquée — ne renvoie rien si
  // l'utilisateur n'est pas membre ou si le club n'existe pas).
  const { count } = await supabase
    .from('memberships')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('club_id', clubId)
    .eq('is_active', true)

  if (!count || count === 0) return { ok: false }

  // Cookie de préférence : non httpOnly (lu côté client pour la UI), 1 an de durée,
  // SameSite=lax pour la compatibilité avec les redirections.
  cookieStore.set(ACTIVE_CLUB_COOKIE, clubId, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 an
    secure: process.env.NODE_ENV === 'production',
  })

  return { ok: true }
}
