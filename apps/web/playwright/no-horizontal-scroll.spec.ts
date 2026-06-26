/**
 * Tests E2E — non-régression scroll horizontal de PAGE sur mobile (375px) dans l'admin.
 *
 * La plainte des admins : sur mobile, les vues admin débordent latéralement (la PAGE scrolle,
 * pas seulement un tableau). Offenders identifiés : la frise `ContributionsTimeline`
 * (grid-cols-12), les tables (`MembersList`), les onglets / blocs de `AdminPollsView`.
 * Le scroll INTERNE d'un tableau (wrapper `overflow-x-auto`) reste légitime ; le bug est quand
 * `document.documentElement.scrollWidth > clientWidth` (la PAGE elle-même déborde).
 *
 * Cette spec scanne les routes admin au viewport 375px et asserte qu'aucune ne fait déborder
 * la page (`scrollWidth <= clientWidth + 1`, tolérance d'arrondi sub-pixel).
 *
 * Stratégie d'auth : on réutilise `loginAsSeedMember` (helpers.ts) qui connecte le membre seed,
 * marque l'onboarding terminé et charge /dashboard. Pour /admin/*, on élève le seed en
 * 'treasurer' le temps de la suite (pattern emprunté à cursor-pointer.spec.ts / admin.spec.ts).
 *
 * Exécution sérielle (workers:1, fullyParallel:false dans playwright.config.ts) : les specs
 * partagent l'unique membre seed re-clé à chaque login.
 *
 * Réf : CLAUDE.md (a11y AA mini, cibles ≥44px, mobile-first), helpers.ts, cursor-pointer.spec.ts.
 */

import { test, expect, type Page } from '@playwright/test'
import postgres from 'postgres'

import { loginAsSeedMember, SEED_EMAIL } from './helpers'

const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const SEED_CLUB_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

// Viewport mobile de référence (iPhone SE / petit Android) : c'est la largeur où les admins
// constatent le débordement.
const MOBILE_VIEWPORT = { width: 375, height: 812 } as const

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

/** id de l'adhésion du membre seed dans le club seed (pour le mode « membre » de /admin/cotisations). */
async function seedMembershipId(): Promise<string | null> {
  return withDb(async (sql) => {
    const rows = await sql<{ id: string }[]>`
      SELECT m.id
        FROM memberships m
        JOIN users u ON u.id = m.user_id
       WHERE m.club_id = ${SEED_CLUB_ID}::uuid
         AND u.email = ${SEED_EMAIL}
       LIMIT 1
    `
    return rows[0]?.id ?? null
  })
}

/** Charge la route, attend le réseau au repos, et asserte que la PAGE ne déborde pas latéralement. */
async function assertNoHorizontalScroll(page: Page, route: string): Promise<void> {
  await page.goto(route)
  await page.waitForLoadState('networkidle')
  const { scrollWidth, clientWidth, offenders } = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    // Coupables RÉELS du débordement de page : bord droit > viewport ET aucun ancêtre ne confine.
    // Un ancêtre confine s'il clippe (overflow-x auto/hidden/scroll/clip) OU s'il isole sa mise en
    // page via `contain` (layout/content/strict) — ce dernier empêche la largeur min-content d'un
    // <table> de remonter à la PAGE (cf. fix MembersList). On ignore ainsi le contenu scrollé en
    // interne (faux positifs) et on ne pointe que les vrais débordements de page.
    const confined = (el: HTMLElement): boolean => {
      let n: HTMLElement | null = el.parentElement
      while (n && n !== document.body) {
        const cs = getComputedStyle(n)
        const ox = cs.overflowX
        if (ox === 'auto' || ox === 'hidden' || ox === 'scroll' || ox === 'clip') return true
        if (/\b(layout|content|strict)\b/.test(cs.contain)) return true
        n = n.parentElement
      }
      return false
    }
    const offenders: string[] = []
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.right > vw + 1 && !confined(el)) {
        const cls = typeof el.className === 'string' ? el.className : ''
        offenders.push(
          `${el.tagName.toLowerCase()}.${cls.split(/\s+/).slice(0, 4).join('.')} right=${Math.round(r.right)} w=${Math.round(r.width)}`
        )
      }
    }
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: vw,
      offenders: offenders.slice(0, 12),
    }
  })
  // Tolérance +1px : arrondis sub-pixel du moteur de rendu (jamais un vrai débordement).
  expect(
    scrollWidth,
    `Scroll horizontal de PAGE sur ${route} (375px) : scrollWidth=${scrollWidth} > clientWidth=${clientWidth}.\n` +
      `→ Confiner le scroll en INTERNE : overflow-x-auto + min-w-0 sur le conteneur fautif, et\n` +
      `  [contain:layout] sur un wrapper de <table> (sinon sa largeur min-content remonte à la PAGE).\n` +
      `  Jamais via overflow-x:hidden global. Offenders connus : ContributionsTimeline, MembersList, AdminPollsView.\n` +
      `Éléments qui débordent (non confinés) :\n  ${offenders.join('\n  ')}`
  ).toBeLessThanOrEqual(clientWidth + 1)
}

test.describe('scroll horizontal mobile — vues admin (375px)', () => {
  // Viewport mobile pour toute la suite.
  test.use({ viewport: MOBILE_VIEWPORT })

  // Le membre seed est élevé en 'treasurer' pour autoriser /admin/* ; remis à 'member' après.
  test.beforeAll(async () => {
    await setSeedRole('treasurer')
  })

  test.afterAll(async () => {
    await setSeedRole('member')
  })

  // Routes de l'espace admin scannées (toutes les sous-pages de l'AdminTabs).
  const ADMIN_ROUTES = [
    '/admin',
    '/admin/members',
    '/admin/cotisations',
    '/admin/invitations',
    '/admin/votes',
    '/admin/retours',
    '/admin/settings',
  ]

  for (const route of ADMIN_ROUTES) {
    test(`${route} → pas de scroll horizontal de page`, async ({ page }) => {
      await loginAsSeedMember(page) // connecte + onboarding=true + charge /dashboard
      await assertNoHorizontalScroll(page, route)
    })
  }

  // Mode « membre » de /admin/cotisations (panneau MemberCotisationsPanel → ContributionsTimeline,
  // l'offender PRINCIPAL : la frise grid-cols-12). On dérive l'id d'adhésion du membre seed.
  // Si l'id n'est pas dérivable (seed minimal), on l'indique : le mode membre reste couvert par
  // la story Storybook de ContributionsTimeline (viewport mobile).
  test('/admin/cotisations?membre=<id> (frise membre) → pas de scroll horizontal de page', async ({
    page,
  }) => {
    const membershipId = await seedMembershipId()
    test.skip(
      membershipId === null,
      'membershipId du seed introuvable — mode membre couvert par la story ContributionsTimeline.'
    )
    await loginAsSeedMember(page)
    await assertNoHorizontalScroll(page, `/admin/cotisations?membre=${membershipId}`)
  })
})
