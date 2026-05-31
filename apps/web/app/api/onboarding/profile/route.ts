// Endpoint POST /api/onboarding/profile — finalise le profil d'un membre à la première connexion.
//
// Flux (AUT-007) :
//   1. Validation du corps JSON (zod) — `rgpd_consented: true` est un littéral obligatoire → 422
//   2. Récupération de la session via cookie Supabase → 401 si absente
//   3. Vérification de l'existence de la ligne users (handle_new_user l'a créée au premier login) → 403
//   4. UPDATE users SET firstname, lastname, phone, address, avatar_url,
//                        onboarding_completed=true, rgpd_consented_at, directory_opt_in
//      WHERE id = auth.uid() — la policy RLS "users: self update" laisse passer → 200
//
// Réf : ARCHITECTURE.md §1, DATA_MODEL.md §2 (table users), CLAUDE.md (conventions RGPD).

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@evolve/data'

export const runtime = 'nodejs'

const bodySchema = z.object({
  firstname: z.string().trim().min(1).max(60),
  lastname: z.string().trim().min(1).max(60),
  phone: z.string().trim().max(30).nullish(),
  address: z.string().trim().max(200).nullish(),
  avatar_url: z.string().url().nullish(),
  rgpd_consented: z.literal(true),
  directory_opt_in: z.boolean(),
})

export async function POST(request: Request): Promise<NextResponse> {
  // 1. Validation du corps — rgpd_consented doit être exactement `true`.
  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json(
      { error: 'Données invalides ou consentement RGPD manquant.' },
      { status: 422 }
    )
  }

  // 2. Client Supabase serveur (session via cookies — cookies() est async en Next.js 16).
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  // 3. Authentification.
  const { data: auth, error: authErr } = await supabase.auth.getUser()
  if (authErr) return NextResponse.json({ error: 'Erreur auth.' }, { status: 500 })
  const user = auth.user
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  // 4. Vérifier que la ligne users existe (le trigger handle_new_user l'a normalement créée).
  //    Si elle est absente, l'email n'était pas pré-inscrit dans un club actif.
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()
  if (!existing) {
    return NextResponse.json({ error: "Ton email n'est pas dans un club actif." }, { status: 403 })
  }

  // 5. Mise à jour du profil + marquage onboarding terminé.
  const { error: updErr } = await supabase
    .from('users')
    .update({
      firstname: body.firstname,
      lastname: body.lastname,
      phone: body.phone ?? null,
      address: body.address ?? null,
      avatar_url: body.avatar_url ?? null,
      onboarding_completed: true,
      rgpd_consented_at: new Date().toISOString(),
      directory_opt_in: body.directory_opt_in,
    })
    .eq('id', user.id)
  if (updErr) return NextResponse.json({ error: "Échec de l'enregistrement." }, { status: 500 })

  return NextResponse.json({ user_id: user.id, onboarding_completed: true })
}
