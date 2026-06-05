import { stripAccents } from '@evolve/utils'
import type { MembershipLookup, UserUpsert } from '../../types/sheets'

/**
 * Normalisation de nom pour le matching d'un membre Base vers un membership existant.
 * trim + minuscule + accents retirés — superset du matching cotisations (qui n'enlève
 * pas les accents) pour absorber « NGORAN Stéphane » ≡ « NGORAN Stephane ». Choix assumé :
 * on est plus tolérant ici car une faute de match déclencherait un INSERT en doublon.
 */
export function normalizeName(name: string): string {
  return stripAccents(name.trim().toLowerCase())
}

/**
 * Résolution DB-aware de l'email d'un membre Base — règle métier centrale (NTF/ADM follow-up) :
 *
 *   « L'email d'un membre n'est réécrit QUE si la feuille BASE fournit un email non vide. »
 *
 * Pourquoi : un admin peut saisir un vrai email pour un sortant absent de la source. La sync
 * suivante (feuille toujours vide) ne doit JAMAIS écraser cet email — sinon le mapper régénère
 * le placeholder déterministe, `onConflict(email)` ne matche plus la ligne (qui porte maintenant
 * le vrai email) et un doublon est INSÉRÉ. Cette fonction lève cet écueil.
 *
 * - Feuille NON vide (`sheetEmailEmpty=false`) : la feuille est source de vérité → on conserve
 *   l'email mappé (déjà normalisé) et `email_is_placeholder` tel quel. Comportement INCHANGÉ.
 * - Feuille VIDE (`sheetEmailEmpty=true`) : on NE réécrit PAS l'email. On matche le membre par
 *   nom normalisé dans les memberships existants :
 *     • trouvé (1 seul) → on réutilise l'email ACTUEL en base comme clé d'upsert (placeholder OU
 *       vrai email saisi par l'admin), `email_is_placeholder` inchangé. L'email reste intact ;
 *     • collision (≥2 mêmes noms normalisés) → on ne devine pas : retour au placeholder mappé +
 *       warning doux (sécurité : un mauvais match créerait un doublon) ;
 *     • non trouvé (nouveau membre sans email) → placeholder mappé (comportement actuel).
 *
 * Pure et déterministe : aucune I/O. Testable en Vitest et importable par l'Edge Function Deno.
 */
export function resolveBaseEmail(
  mappedUser: Pick<UserUpsert, 'email' | 'full_name' | 'email_is_placeholder'>,
  sheetEmailEmpty: boolean,
  existingMemberships: MembershipLookup[]
): { email: string; email_is_placeholder: boolean; warning: string | null } {
  // Feuille source de vérité : on n'altère rien.
  if (!sheetEmailEmpty) {
    return {
      email: mappedUser.email,
      email_is_placeholder: mappedUser.email_is_placeholder,
      warning: null,
    }
  }

  // Feuille vide : matching par nom pour réutiliser l'email existant.
  const target = normalizeName(mappedUser.full_name)
  const matches = existingMemberships.filter((m) => normalizeName(m.full_name) === target)

  if (matches.length === 1) {
    const existing = matches[0]!
    const existingEmail = (existing.email ?? '').trim()
    if (existingEmail !== '') {
      // On réutilise l'email ACTUEL (placeholder ou vrai email admin) → onConflict matche la
      // bonne ligne, l'email reste INCHANGÉ. On NE touche pas à email_is_placeholder.
      return {
        email: existingEmail,
        email_is_placeholder: existing.email_is_placeholder ?? mappedUser.email_is_placeholder,
        warning: null,
      }
    }
    // Membre connu mais sans email en base (cas limite) → placeholder mappé, idempotent.
    return {
      email: mappedUser.email,
      email_is_placeholder: mappedUser.email_is_placeholder,
      warning: null,
    }
  }

  if (matches.length > 1) {
    // Ambiguïté : on ne devine pas quelle ligne mettre à jour. Repli sur le placeholder
    // déterministe (sécurité) + warning doux pour tracer l'homonymie dans le snapshot.
    return {
      email: mappedUser.email,
      email_is_placeholder: mappedUser.email_is_placeholder,
      warning: `Homonymes pour "${mappedUser.full_name}" : email non réécrit (placeholder conservé).`,
    }
  }

  // Aucun match (nouveau membre sans email) → placeholder déterministe (comportement actuel).
  return {
    email: mappedUser.email,
    email_is_placeholder: mappedUser.email_is_placeholder,
    warning: null,
  }
}
