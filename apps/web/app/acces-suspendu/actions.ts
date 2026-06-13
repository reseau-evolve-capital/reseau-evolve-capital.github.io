'use server'

// Déconnexion depuis l'écran « accès suspendu » (ADM-007). Server Action : la route /acces-suspendu
// est hors des groupes (app)/(auth) → pas de SupabaseProvider client. On clôt la session côté
// serveur (cookies) puis on redirige vers /login.

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@evolve/data'
import { captureActionError } from '@/lib/monitoring/sentry'

export async function signOutAction(): Promise<void> {
  const supabase = createServerClient(await cookies())
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      captureActionError(error, { action: 'signOut', extra: { code: error.code } })
    }
  } catch (err) {
    captureActionError(err, { action: 'signOut' })
  }
  // Redirection inconditionnelle : même en cas d'erreur signOut, on renvoie vers /login.
  redirect('/login')
}
