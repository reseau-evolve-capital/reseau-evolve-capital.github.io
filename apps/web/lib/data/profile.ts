// Couche data de la fiche profil membre (A2 — écran /profil, lecture seule V0).
//
// Lit le profil du membre COURANT (self) : la policy « users: self read » (migration 011)
// autorise `id = auth.uid()`, donc pas de service-role. On joint la dernière adhésion active
// pour le rôle / la date d'entrée et le club. RLS isole tout par auth.uid().
//
// Réf : DATA_MODEL.md §2 (users, memberships, clubs), CLAUDE.md (jamais de NaN/—, jamais service-role).

import type { createServerClient } from '@evolve/data'
import type { Database } from '@evolve/data'

/** Client Supabase serveur tel que retourné par `createServerClient` (session + RLS). */
type ServerClient = ReturnType<typeof createServerClient>

type UserRow = Database['public']['Tables']['users']['Row']
export type MemberRole = Database['public']['Enums']['member_role']

export interface ProfileData {
  fullName: string | null
  email: string | null
  phone: string | null
  avatarUrl: string | null
  /** Rôle dans le club actif (null si aucune adhésion active). */
  role: MemberRole | null
  /** Date d'entrée ISO (YYYY-MM-DD) de l'adhésion active, ou null. */
  joinedAt: string | null
  /** Club actif (dernière adhésion active), ou null. */
  club: { name: string; city: string | null } | null
}

/** Charge la fiche profil du membre courant. RLS isole par auth.uid().
 *  Ne renvoie jamais null : un champ manquant est porté à null (l'UI fallback sur « — »). */
export async function getProfileData(supabase: ServerClient, userId: string): Promise<ProfileData> {
  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase
      .from('users')
      .select('full_name, email, phone, avatar_url')
      .eq('id', userId)
      .maybeSingle<Pick<UserRow, 'full_name' | 'email' | 'phone' | 'avatar_url'>>(),
    supabase
      .from('memberships')
      .select('role, joined_at, clubs(name, city)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle<{
        role: MemberRole
        joined_at: string | null
        clubs: { name: string; city: string | null } | null
      }>(),
  ])

  return {
    fullName: profile?.full_name ?? null,
    email: profile?.email ?? null,
    phone: profile?.phone ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    role: membership?.role ?? null,
    joinedAt: membership?.joined_at ?? null,
    club: membership?.clubs ? { name: membership.clubs.name, city: membership.clubs.city } : null,
  }
}

/** Valeurs de pré-remplissage de l'onboarding, lues depuis `users` (synchronisé via Sheets). */
export interface OnboardingDefaults {
  firstname: string
  lastname: string
  phone: string
  address: string
  avatarUrl: string | null
}

/**
 * Dérive prénom/nom à partir des colonnes `firstname`/`lastname`/`full_name`.
 *
 * GOTCHA data (sync Sheets) : `firstname` contient parfois le nom COMPLET
 * (ex. « SAMA Abdel Haq » alors que le nom de famille est « OURO »). On privilégie
 * donc le couple `firstname` + `lastname` quand `lastname` est renseigné. Si `lastname`
 * est vide, on retombe sur un découpage de `full_name` : premier token = nom (les feuilles
 * stockent « NOM Prénom »), reste = prénom — filet de sécurité pour ne jamais laisser un
 * champ requis vide quand la donnée existe.
 */
export function deriveNameParts(
  firstname: string | null,
  lastname: string | null,
  fullName: string | null
): { firstname: string; lastname: string } {
  const fn = (firstname ?? '').trim()
  const ln = (lastname ?? '').trim()
  if (ln) return { firstname: fn, lastname: ln }

  // lastname absent : on tente de dériver depuis full_name (« NOM Prénom »).
  const tokens = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (tokens.length >= 2) {
    const [first, ...rest] = tokens
    return { firstname: rest.join(' '), lastname: first ?? '' }
  }
  // Pas assez d'info : on garde ce qu'on a (firstname éventuel, lastname vide).
  return { firstname: fn, lastname: ln }
}

/**
 * Charge les valeurs de pré-remplissage de l'onboarding pour le membre courant.
 * RLS « users: self read » autorise `id = auth.uid()` — pas de service-role.
 * Renvoie toujours des chaînes (jamais null sauf `avatarUrl`) pour hydrater le form sans risque.
 */
export async function getOnboardingDefaults(
  supabase: ServerClient,
  userId: string
): Promise<OnboardingDefaults> {
  const { data } = await supabase
    .from('users')
    .select('firstname, lastname, full_name, phone, address, avatar_url')
    .eq('id', userId)
    .maybeSingle<
      Pick<UserRow, 'firstname' | 'lastname' | 'full_name' | 'phone' | 'address' | 'avatar_url'>
    >()

  const { firstname, lastname } = deriveNameParts(
    data?.firstname ?? null,
    data?.lastname ?? null,
    data?.full_name ?? null
  )

  return {
    firstname,
    lastname,
    phone: (data?.phone ?? '').trim(),
    address: (data?.address ?? '').trim(),
    avatarUrl: data?.avatar_url ?? null,
  }
}
