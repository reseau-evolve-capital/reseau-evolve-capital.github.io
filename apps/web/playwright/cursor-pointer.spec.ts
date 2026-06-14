/**
 * Tests E2E — non-régression curseur a11y (RGAA 3.3).
 *
 * Le preflight Tailwind v4 ne pose plus `cursor: pointer` sur `<button>` (régression vs v3) :
 * la main ne s'affiche plus au survol des éléments cliquables. Un filet global vit désormais
 * dans `packages/design-system/styles/index.css` (@layer base). Cette spec scanne les routes
 * et REMONTE tout élément interactif dont le `cursor` calculé n'est pas `pointer`, avec un
 * message TRÈS verbeux (tag, role, id, classes, texte) pour qu'un agent puisse corriger direct.
 *
 * Stratégie d'auth : on réutilise `loginAsSeedMember` (helpers.ts) qui connecte le membre seed,
 * marque l'onboarding terminé et charge /dashboard. Pour /admin/*, on élève le seed en
 * 'treasurer' le temps de la suite (pattern emprunté à admin.spec.ts). Le scan /onboarding
 * réinitialise `onboarding_completed=false` puis relogue (le verify atterrit sur step-1).
 *
 * Exécution sérielle (workers:1, fullyParallel:false dans playwright.config.ts) : les specs
 * partagent l'unique membre seed re-clé à chaque login.
 *
 * Réf : CLAUDE.md (a11y AA mini, focus visible, RGAA 3.3), helpers.ts, admin.spec.ts.
 */

import { test, expect, type Page } from '@playwright/test'
import postgres from 'postgres'

import {
  completeOnboardingFor,
  generateMagicLink,
  loginAsSeedMember,
  resetOnboardingFor,
  SEED_EMAIL,
} from './helpers'

const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const SEED_CLUB_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

// ─────────────────────────────────────────────────────────────────────────────
// Sélecteur des cliquables
// ─────────────────────────────────────────────────────────────────────────────
//
// On cible les éléments NATIVEMENT interactifs + les cliquables custom du projet, qui
// portent TOUJOURS `role="button"`/`role="link"` (cf. convention a11y du design-system).
// On EXCLUT volontairement :
//   - le `[tabindex]` nu : focusable ≠ cliquable (trop bruyant ; les vrais cliquables ont un role) ;
//   - les désactivés (`:disabled` / `aria-disabled="true"`) : ils doivent être `not-allowed`, pas `pointer` ;
//   - les éléments masqués (offsetParent===null ou visibility:hidden) : hors viewport / repliés → faux positifs.
const INTERACTIVE_SELECTOR = [
  'button:not([disabled])',
  '[role="button"]:not([aria-disabled="true"])',
  'a[href]',
  '[role="link"]',
  'select:not([disabled])',
  'summary',
  'input[type="submit"]:not([disabled])',
  'input[type="button"]:not([disabled])',
  'input[type="reset"]:not([disabled])',
].join(', ')

type Offender = {
  route: string
  tag: string
  role: string | null
  id: string | null
  classes: string
  text: string
  cursor: string
}

/**
 * Scanne la page courante et renvoie la liste des cliquables visibles dont le `cursor`
 * calculé n'est pas `pointer`. Le détail (tag/role/id/classes/texte) sert au diagnostic.
 */
async function findCursorOffenders(page: Page, route: string): Promise<Offender[]> {
  const raw = await page.evaluate((selector) => {
    const out: Array<{
      tag: string
      role: string | null
      id: string | null
      classes: string
      text: string
      cursor: string
    }> = []
    const els = Array.from(document.querySelectorAll<HTMLElement>(selector))
    for (const el of els) {
      // Exclure les éléments masqués (repliés / hors flux) → évite le bruit.
      const style = getComputedStyle(el)
      const hidden =
        el.offsetParent === null || style.display === 'none' || style.visibility === 'hidden'
      if (hidden) continue
      if (style.cursor === 'pointer') continue
      out.push({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        id: el.getAttribute('id'),
        classes: el.getAttribute('class') ?? '',
        text: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
        cursor: style.cursor,
      })
    }
    return out
  }, INTERACTIVE_SELECTOR)

  return raw.map((r) => ({ route, ...r }))
}

/** Formate les offenders en message d'erreur verbeux, prêt à guider une correction. */
function formatOffenders(offenders: Offender[]): string {
  const lines = offenders.map((o, i) => {
    const role = o.role ? ` role="${o.role}"` : ''
    const id = o.id ? ` id="${o.id}"` : ''
    return [
      `  [${i + 1}] <${o.tag}${role}${id}>  cursor=${o.cursor}`,
      `      route : ${o.route}`,
      `      text  : ${o.text || '(vide)'}`,
      `      class : ${o.classes || '(aucune)'}`,
    ].join('\n')
  })
  return (
    `${offenders.length} cliquable(s) sans cursor:pointer (RGAA 3.3) :\n${lines.join('\n')}\n\n` +
    `→ Corriger : soit le filet global @layer base (packages/design-system/styles/index.css),\n` +
    `  soit le composant fautif (ajouter cursor-pointer / role / type adéquat).`
  )
}

/** Charge la route, attend le réseau au repos, scanne, et asserte 0 offender. */
async function assertNoCursorOffenders(page: Page, route: string): Promise<void> {
  await page.goto(route)
  await page.waitForLoadState('networkidle')
  const offenders = await findCursorOffenders(page, route)
  expect(offenders, offenders.length ? formatOffenders(offenders) : '').toEqual([])
}

/** Client postgres mono-connexion, fermé en fin d'appel. */
async function withDb<T>(fn: (sql: ReturnType<typeof postgres>) => Promise<T>): Promise<T> {
  const sql = postgres(DB_URL, { max: 1 })
  try {
    return await fn(sql)
  } finally {
    await sql.end()
  }
}

/** Bascule le rôle du seed dans le club (par EMAIL → robuste au re-key user au login). */
async function setSeedRole(role: 'member' | 'treasurer'): Promise<void> {
  await withDb(async (sql) => {
    await sql`
      UPDATE memberships
         SET role = ${role}::member_role
       WHERE club_id = ${SEED_CLUB_ID}::uuid
         AND user_id IN (SELECT id FROM users WHERE email = ${SEED_EMAIL})
    `
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloc 1 — Routes PUBLIQUES (sans auth)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('curseur a11y — routes publiques', () => {
  const PUBLIC_ROUTES = ['/', '/login', '/login/check-email', '/legal/charter', '/legal/privacy']

  for (const route of PUBLIC_ROUTES) {
    test(`${route} → tous les cliquables visibles en cursor:pointer`, async ({ page }) => {
      await assertNoCursorOffenders(page, route)
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Bloc 2 — Routes AUTHENTIFIÉES (membre seed ; trésorier le temps de la suite)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('curseur a11y — routes authentifiées', () => {
  // Le membre seed est élevé en 'treasurer' pour autoriser /admin/* ; remis à 'member' après.
  test.beforeAll(async () => {
    await setSeedRole('treasurer')
  })

  test.afterAll(async () => {
    await setSeedRole('member')
  })

  // Routes de l'espace membre + admin (onboarding terminé via loginAsSeedMember).
  const AUTH_ROUTES = [
    '/dashboard',
    '/portfolio',
    '/contributions',
    '/profil',
    '/votes',
    '/admin',
    '/admin/members',
    '/admin/cotisations',
    '/admin/votes',
  ]

  for (const route of AUTH_ROUTES) {
    test(`${route} → tous les cliquables visibles en cursor:pointer`, async ({ page }) => {
      await loginAsSeedMember(page) // connecte + onboarding=true + charge /dashboard
      await assertNoCursorOffenders(page, route)
    })
  }

  // Scan du flow onboarding : on réinitialise onboarding=false PUIS on login SANS le compléter
  // (loginAsSeedMember complète l'onboarding en interne → inutilisable ici). Le verify d'un user
  // non-onboardé atterrit sur /onboarding/step-1 ; le guard A1 l'y maintient.
  test('/onboarding/step-1 → tous les cliquables visibles en cursor:pointer', async ({ page }) => {
    await resetOnboardingFor(SEED_EMAIL)
    try {
      const token = await generateMagicLink(SEED_EMAIL)
      await page.goto(`/login/verify?token_hash=${token}&type=email`)
      await page.waitForURL(/\/onboarding\/step-1/, { timeout: 20_000 })
      await page.waitForLoadState('networkidle')
      await assertNoCursorOffenders(page, '/onboarding/step-1')
    } finally {
      // Restaure l'état attendu par les autres specs (seed onboardé).
      await completeOnboardingFor(SEED_EMAIL)
    }
  })
})
