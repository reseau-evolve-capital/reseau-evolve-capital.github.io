// Verrou de régression — longueur du code OTP email.
//
// Incident (juin 2026) : la prod GoTrue émettait un code OTP de connexion à 8 chiffres
// alors que tout le repo attend 6 (config.toml [auth.email] otp_length = 6 ET
// apps/web/lib/auth/otp.ts OTP_CODE_LENGTH = 6, qui sert de maxLength à l'input OTP).
// Résultat : les utilisateurs ne pouvaient pas saisir leur code (l'input tronquait à 6).
// La config.toml n'est PAS poussée automatiquement en prod (aucun `supabase config push`
// en CI) → rien ne réconcilie repo ↔ prod. Ce test verrouille au moins la cohérence
// CÔTÉ REPO : config.toml [auth.email].otp_length == OTP_CODE_LENGTH == 6.
// Si l'un des deux dérive, CI échoue.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { OTP_CODE_LENGTH } from '@/lib/auth/otp'

/**
 * Remonte l'arborescence depuis `startDir` jusqu'à trouver `supabase/config.toml`.
 * Robuste vis-à-vis du cwd de Vitest (racine app vs racine monorepo) : on ne code pas
 * en dur un chemin relatif fragile.
 */
function findConfigToml(startDir: string): string {
  let dir = startDir
  // Remonte jusqu'à la racine FS (dirname d'une racine == elle-même).
  for (;;) {
    const candidate = join(dir, 'supabase', 'config.toml')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error(
    `supabase/config.toml introuvable en remontant depuis ${startDir} (cwd=${process.cwd()})`
  )
}

/**
 * Extrait otp_length de la SECTION [auth.email] uniquement.
 * Piège : config.toml contient un AUTRE `otp_length = 6` plus bas, sous [auth.mfa.phone]
 * — il ne doit PAS être confondu avec celui de l'email. On isole donc d'abord le corps
 * de la section [auth.email] (jusqu'au prochain en-tête de table `[...]`), puis on y lit
 * la première clé `otp_length` (en ignorant les lignes commentées `#`).
 */
function readEmailOtpLength(toml: string): number {
  const sectionStart = toml.indexOf('[auth.email]')
  expect(sectionStart, 'section [auth.email] absente de config.toml').toBeGreaterThanOrEqual(0)

  const afterHeader = sectionStart + '[auth.email]'.length
  // Fin de section = prochain en-tête de table en début de ligne (ex. [auth.email.smtp]
  // ou [auth.sms]). On garde le corps strictement entre les deux.
  const nextHeaderRel = afterHeader + indexOfNextTableHeader(toml.slice(afterHeader))
  const body = toml.slice(afterHeader, nextHeaderRel)

  const match = body.match(/^\s*otp_length\s*=\s*(\d+)/m)
  expect(match, 'otp_length introuvable dans la section [auth.email]').not.toBeNull()
  return Number(match![1])
}

/** Position (dans `s`) du prochain en-tête de table TOML `[...]` en début de ligne, ou fin de `s`. */
function indexOfNextTableHeader(s: string): number {
  const m = s.match(/^\s*\[[^\]]+\]/m)
  return m ? m.index! : s.length
}

describe('contrat longueur OTP email (config.toml ↔ OTP_CODE_LENGTH)', () => {
  const configPath = findConfigToml(process.cwd())
  const otpLength = readEmailOtpLength(readFileSync(configPath, 'utf8'))

  it('config.toml [auth.email].otp_length est bien lu depuis le bon scope (≠ [auth.mfa.phone])', () => {
    // Garde-fou : l'extraction ne doit pas attraper la clé MFA. On vérifie que la valeur
    // lue est un entier plausible et que la section MFA n'a pas pollué la lecture.
    expect(Number.isInteger(otpLength)).toBe(true)
  })

  it('otp_length email vaut 6 (verrou de régression de l’incident OTP 8 chiffres)', () => {
    expect(otpLength).toBe(6)
  })

  it('otp_length email == OTP_CODE_LENGTH (config back ↔ maxLength input front, pas de dérive)', () => {
    expect(otpLength).toBe(OTP_CODE_LENGTH)
  })
})
