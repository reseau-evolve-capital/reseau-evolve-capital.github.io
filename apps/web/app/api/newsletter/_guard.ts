// Garde staff partagée des routes /api/newsletter/* (EDI-006).
//
// Même contrat que les routes /api/admin/* : auth → resolveAdminContext (trésorier+ dans
// un club, via RLS) → sinon 401/403. JAMAIS de service-role. Renvoie le client + le contexte
// pour la suite du traitement, ou une NextResponse d'erreur prête à retourner.

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@evolve/data'
import { resolveAdminContext, type AdminContext } from '@/lib/data/admin'
import { ACTIVE_CLUB_COOKIE } from '@/lib/data/request'

type ServerClient = ReturnType<typeof createServerClient>

export interface GuardOk {
  ok: true
  supabase: ServerClient
  ctx: AdminContext
}
export interface GuardErr {
  ok: false
  response: NextResponse
}

/** Garde staff : valide la session et le rôle trésorier+. */
export async function guardStaff(): Promise<GuardOk | GuardErr> {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Erreur d'authentification." }, { status: 500 }),
    }
  }
  if (!auth.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }),
    }
  }

  const activeClubId = cookieStore.get(ACTIVE_CLUB_COOKIE)?.value ?? null
  const ctx = await resolveAdminContext(supabase, auth.user.id, activeClubId)
  if (!ctx) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Rôle insuffisant.' }, { status: 403 }),
    }
  }
  return { ok: true, supabase, ctx }
}
