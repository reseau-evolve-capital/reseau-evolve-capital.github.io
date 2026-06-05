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
