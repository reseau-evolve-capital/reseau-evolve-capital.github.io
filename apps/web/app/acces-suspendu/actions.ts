'use server'

// Déconnexion depuis l'écran « accès suspendu » (ADM-007). Server Action : la route /acces-suspendu
// est hors des groupes (app)/(auth) → pas de SupabaseProvider client. On clôt la session côté
// serveur (cookies) puis on redirige vers /login.

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@evolve/data'

export async function signOutAction(): Promise<void> {
  const supabase = createServerClient(await cookies())
  await supabase.auth.signOut()
  redirect('/login')
}
