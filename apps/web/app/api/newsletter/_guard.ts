// Garde RÉSEAU partagée des routes /api/newsletter/* (EDI-006 ; déplacée du staff club vers
// le bureau du réseau).
//
// La newsletter « La Quote-Part » est pilotée par l'équipe RÉSEAU (network_admin / network_board),
// pas par le staff d'un club. Comme /api/* est EXCLU du middleware (cf. middleware matcher), cette
// garde est l'UNIQUE protection de ces routes : auth → resolveNetworkContext (membre réseau, via
// la RLS self-read de network_members) → sinon 401/403. JAMAIS de service-role. Renvoie le client
// + le contexte réseau pour la suite, ou une NextResponse d'erreur prête à retourner.

import { NextResponse } from 'next/server'
import { createServerClient } from '@evolve/data'
import { cookies } from 'next/headers'
import { resolveNetworkContext, type NetworkContext } from '@/lib/data/network'

type ServerClient = ReturnType<typeof createServerClient>

export interface GuardOk {
  ok: true
  supabase: ServerClient
  ctx: NetworkContext
}
export interface GuardErr {
  ok: false
  response: NextResponse
}

/** Garde réseau : valide la session et l'appartenance à l'équipe réseau (network_admin/board). */
export async function guardNetwork(): Promise<GuardOk | GuardErr> {
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

  const ctx = await resolveNetworkContext(supabase, auth.user.id)
  if (!ctx) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Rôle insuffisant.' }, { status: 403 }),
    }
  }
  return { ok: true, supabase, ctx }
}
