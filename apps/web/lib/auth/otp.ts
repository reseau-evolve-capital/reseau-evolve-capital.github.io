/**
 * Logique pure de la connexion par code OTP 6 chiffres (fix PWA juin).
 *
 * Contexte : sur iOS, le magic link s'ouvre toujours dans Safari, jamais dans la
 * PWA installée. L'email de connexion contient donc AUSSI le code OTP 6 chiffres
 * ({{ .Token }}), saisissable sur /login/check-email DANS la PWA. La vérification
 * passe par `supabase.auth.verifyOtp({ email, token, type: 'email' })` — supporté
 * même quand `signInWithOtp` a été initié en PKCE côté serveur (la session est
 * renvoyée directement par POST /auth/v1/verify, sans code_verifier).
 *
 * Ce module est pur (aucun import React/Supabase) pour être testable en Vitest
 * node — le composant OtpForm ne fait que le câbler.
 */

export const OTP_CODE_LENGTH = 6

/** Ne garde que les chiffres, tronqués à 6 (colle/saisie tolérante : espaces, tirets…). */
export function sanitizeOtpCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, OTP_CODE_LENGTH)
}

/** Code complet = exactement 6 chiffres. */
export function isCompleteOtpCode(code: string): boolean {
  return new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`).test(code)
}

/** Forme minimale (structurelle) de l'erreur renvoyée par supabase.auth.verifyOtp. */
export interface OtpVerifyError {
  code?: string
  status?: number
  message?: string
}

export type OtpErrorKey = 'errorInvalid' | 'errorGeneric'

/**
 * Mappe l'erreur Supabase vers une clé i18n (login.checkEmail.otp.*).
 * GoTrue renvoie `otp_expired` aussi bien pour un code faux que périmé (et 403),
 * `validation_failed` pour un format invalide → message « invalide ou expiré ».
 * Tout le reste (réseau, 5xx, rate-limit) → message générique « réessaie ».
 */
export function otpErrorKey(error: OtpVerifyError | null | undefined): OtpErrorKey {
  if (!error) return 'errorGeneric'
  if (error.code === 'otp_expired' || error.code === 'validation_failed') return 'errorInvalid'
  if (error.status === 400 || error.status === 401 || error.status === 403) return 'errorInvalid'
  return 'errorGeneric'
}

/** Client auth minimal (structurel) — évite de coupler le module à supabase-js. */
export interface OtpAuthClient {
  verifyOtp(params: {
    email: string
    token: string
    type: 'email'
  }): Promise<{ error: OtpVerifyError | null }>
}

export type OtpVerifyResult = { ok: true } | { ok: false; errorKey: OtpErrorKey }

/**
 * Vérifie le code OTP pour `email`. Ne throw jamais : renvoie un résultat
 * discriminé { ok } / { ok: false, errorKey } directement affichable.
 */
export async function verifyEmailOtp(
  auth: OtpAuthClient,
  email: string,
  code: string
): Promise<OtpVerifyResult> {
  const token = sanitizeOtpCode(code)
  if (!isCompleteOtpCode(token)) return { ok: false, errorKey: 'errorInvalid' }
  try {
    const { error } = await auth.verifyOtp({ email: email.trim(), token, type: 'email' })
    if (error) return { ok: false, errorKey: otpErrorKey(error) }
    return { ok: true }
  } catch {
    // Erreur réseau/inattendue : jamais de crash, message générique.
    return { ok: false, errorKey: 'errorGeneric' }
  }
}
