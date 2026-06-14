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
//
// ⚠️ Portée : ce test NE voit PAS la valeur du dashboard prod (la vraie cause de l'incident).
// La protection anti-dérive prod relève du config-as-code (`supabase config push` en CI) ou
// d'un healthcheck prod — voir le suivi owner. Ici on verrouille uniquement le contrat repo.

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
 * Isole le CORPS de la section [auth.email] (de l'en-tête jusqu'au prochain en-tête de
 * table `[...]` en début de ligne). Piège : config.toml contient un AUTRE `otp_length = 6`
 * plus bas, sous [auth.mfa.phone] — il ne doit JAMAIS entrer dans ce corps.
 *
 * ⚠️ Hypothèse : `otp_length` est déclaré AVANT toute sous-table `[auth.email.*]`
 * (ex. [auth.email.smtp], [auth.email.template.*]). C'est l'ordre actuel de config.toml.
 * Si un jour une sous-table était insérée avant `otp_length`, le corps serait coupé trop
 * tôt et `readEmailOtpLength` throw « introuvable » — échec BRUYANT (pas silencieux), donc
 * détectable. Garder `otp_length` directement sous `[auth.email]`.
 */
function readEmailSection(toml: string): string {
  const sectionStart = toml.indexOf('[auth.email]')
  expect(sectionStart, 'section [auth.email] absente de config.toml').toBeGreaterThanOrEqual(0)

  const afterHeader = sectionStart + '[auth.email]'.length
  const nextHeaderRel = afterHeader + indexOfNextTableHeader(toml.slice(afterHeader))
  return toml.slice(afterHeader, nextHeaderRel)
}

/** Extrait otp_length de la SECTION [auth.email] uniquement (cf. readEmailSection). */
function readEmailOtpLength(toml: string): number {
  const body = readEmailSection(toml)
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
  const toml = readFileSync(configPath, 'utf8')
  const otpLength = readEmailOtpLength(toml)

  it('otp_length est lu dans le scope [auth.email], jamais celui de [auth.mfa.phone]', () => {
    // Preuve structurelle : le corps isolé contient bien la clé otp_length, et n'a PAS
    // débordé sur la section MFA (qui a aussi un otp_length) ni sur une autre table.
    const emailBody = readEmailSection(toml)
    expect(emailBody, 'le corps [auth.email] doit contenir otp_length').toMatch(
      /^\s*otp_length\s*=/m
    )
    expect(emailBody, 'le corps [auth.email] ne doit pas déborder sur [auth.mfa').not.toContain(
      '[auth.mfa'
    )
    expect(emailBody, 'le corps [auth.email] ne doit pas déborder sur [auth.sms').not.toContain(
      '[auth.sms'
    )
  })

  it('otp_length email vaut 6 (verrou de régression de l’incident OTP 8 chiffres)', () => {
    expect(otpLength).toBe(6)
  })

  it('otp_length email == OTP_CODE_LENGTH (config back ↔ maxLength input front, pas de dérive)', () => {
    expect(otpLength).toBe(OTP_CODE_LENGTH)
  })
})
