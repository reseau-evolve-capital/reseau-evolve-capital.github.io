/**
 * Tests E2E — Dashboard V2 (expérience A/B, PROMPT-DEV-DASHBOARD-V2-AB).
 *
 * La variante est résolue côté SERVEUR (RSC) au premier rendu de /dashboard :
 * env `DASHBOARD_V2_FORCE` > cookie `ec_dashboard_variant` ∈ {'v1','v2'} > bucket
 * `hashBucket(userId) < DASHBOARD_V2_ROLLOUT` (défaut 0 → V1 fail-safe). Le serveur
 * étant PARTAGÉ entre specs, le forçage par test passe par le COOKIE
 * (`context.addCookies`), jamais par une env var par-test.
 *
 * 8 scénarios :
 *   1. Cookie v2 + mobile  : bloc « Évolution » (toggle 30J|MAX, 30J actif), ribbon
 *      3 cellules, pas de teaser club, micro-label « Courbe illustrative ».
 *   2. Cookie v2 + mobile  : click MAX → aria-pressed bascule, axe en années (« 2018 »),
 *      résumé « depuis ton adhésion ».
 *   3. Cookie v2 + desktop : 5 boutons de période, colonne droite (Statut cotisation +
 *      Ma position + teaser « Portefeuille du club » → /portfolio).
 *   4. Cookie v2 + desktop : « Comprendre ma quote-part » ouvre le dialog ; Escape ferme.
 *   5. Cookie v2 + mobile  : cibles tactiles du toggle — hit-area ::before ≥ 44px
 *      (le bouton visuel fait 28px ; mesures documentées en annotations) + preuve
 *      fonctionnelle (clic AU-DESSUS du pill → la période change).
 *   6. Cookie v1 explicite : pas de bloc « Évolution », hero V1 en card (bouton
 *      « Ta quote-part »).
 *   7. Sans cookie (rollout 0) : identique à V1 (fail-safe).
 *   8. Smoke axe (a11y) sur la V2, mobile + desktop : 0 violation critical/serious.
 *
 * ⚠ Double instance responsive : DashboardEvolutionChart est rendu DEUX fois (mobile
 * `lg:hidden` / desktop `hidden lg:*`). Les locators par RÔLE (getByRole) ne matchent
 * que l'instance visible (display:none = hors arbre a11y) ; les locators par TEXTE
 * matchent les deux → `.filter({ visible: true })` obligatoire (strict mode, gotcha
 * régression consent-banner).
 *
 * Le mock /api/dashboard (payload identique à dashboard.spec.ts) rend le REFETCH client
 * déterministe ; le premier rendu (RSC) vient du seed (global-setup : mêmes valeurs,
 * 12 345,67 € / 0,1234 / 8 000 € / ok). La décision de variante est RSC : le mock route
 * n'influence PAS le branchement V1/V2.
 *
 * Réf : PROMPT-DEV-DASHBOARD-V2-AB, dashboard.spec.ts (patterns), a11y.spec.ts (axe),
 * CLAUDE.md (a11y AA, tap targets ≥ 44px, copy FR).
 */

import { test, expect, type BrowserContext, type Page, type Route } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

import type { DashboardData } from '@/lib/data/dashboard'

import { loginAsSeedMember } from './helpers'

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures partagées
// ─────────────────────────────────────────────────────────────────────────────

/** Nom du cookie de variante — miroir de DASHBOARD_VARIANT_COOKIE
 *  (lib/experiments/dashboard-v2.ts, non importable ici : module `server-only`). */
const VARIANT_COOKIE = 'ec_dashboard_variant'

/** Pose le cookie QA de variante AVANT le premier rendu RSC de /dashboard.
 *  `domain: 'localhost'` : valide quel que soit le port (3001 ou alternatif). */
async function setVariantCookie(context: BrowserContext, variant: 'v1' | 'v2'): Promise<void> {
  await context.addCookies([
    { name: VARIANT_COOKIE, value: variant, domain: 'localhost', path: '/' },
  ])
}

/** DashboardData complète et déterministe — MÊME payload que dashboard.spec.ts
 *  (cohérence inter-specs ; dupliqué car importer un .spec enregistrerait ses tests). */
function makeDashboardData(syncedAt: string): DashboardData {
  return {
    member: {
      firstname: 'Léa',
      fullName: 'Léa Martin',
      role: 'member',
      joinedAt: '2024-01-01T00:00:00.000Z',
    },
    clubId: 'aaaaaaaa-0000-0000-0000-000000000001',
    netMarketValue: 12_345.67,
    detentionPct: 0.1234,
    totalContributed: 8_000,
    contribution: { status: 'ok', amountDue: 0 },
    investment: { cap: 5500, yearInvested: 2000, remaining: 3500 },
    club: { name: 'Club E2E' },
    syncedAt,
  }
}

/** Installe un mock 200 sur /api/dashboard (refetch client déterministe). */
async function mockDashboardRoute(page: Page, data: DashboardData): Promise<void> {
  await page.route('**/api/dashboard*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    })
  })
}

/** Login seed + cookie de variante + mock /api/dashboard, atterrit sur /dashboard. */
async function loginWithVariant(
  page: Page,
  context: BrowserContext,
  variant: 'v1' | 'v2' | null
): Promise<void> {
  if (variant) await setVariantCookie(context, variant)
  await mockDashboardRoute(page, makeDashboardData(new Date().toISOString()))
  await loginAsSeedMember(page)
}

/** Toggle de périodes VISIBLE : getByRole ignore l'instance display:none (double
 *  instance responsive du chart) → exactement 1 match, strict-mode safe. */
function periodGroup(page: Page) {
  return page.getByRole('group', { name: 'Période' })
}

// ─────────────────────────────────────────────────────────────────────────────
// Scénarios 1, 2, 5 : cookie v2 — mobile 375×812
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Dashboard V2 — cookie v2, mobile', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true })

  test.beforeEach(async ({ page, context }) => {
    await loginWithVariant(page, context, 'v2')
  })

  test('bloc Évolution (30J|MAX), ribbon 3 cellules, pas de teaser club', async ({ page }) => {
    // Bloc « Évolution » : titre + toggle visibles (instance compacte mobile).
    await expect(
      page.getByText('Évolution', { exact: true }).filter({ visible: true })
    ).toBeVisible()
    const group = periodGroup(page)
    await expect(group).toBeVisible()

    // Mobile (<768px) : seuls 30J et MAX sont visibles ; 30J actif par défaut.
    await expect(group.getByRole('button')).toHaveCount(2)
    await expect(group.getByRole('button', { name: '30J' })).toHaveAttribute('aria-pressed', 'true')
    await expect(group.getByRole('button', { name: 'MAX' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    // 7J/90J/1A : `hidden md:inline-flex` → hors arbre a11y sur mobile.
    for (const label of ['7J', '90J', '1A']) {
      await expect(group.getByRole('button', { name: label })).toHaveCount(0)
    }

    // Micro-label demo data (l'instance desktop, display:none, est filtrée).
    await expect(page.getByText('Courbe illustrative').filter({ visible: true })).toBeVisible()

    // Ribbon 3 cellules. Capacité = label COURT « Capacité » (v2.capacityShort — le libellé
    // complet tronquait en ellipsis sur 375px ; réf mobile = « CAPACITÉ »). `exact: true` :
    // le libellé complet subsiste dans la card desktop « Ma position » (cachée ici).
    await expect(page.getByText('Ma détention').filter({ visible: true })).toBeVisible()
    await expect(page.getByText('Total cotisé').filter({ visible: true })).toBeVisible()
    await expect(
      page.getByText('Capacité', { exact: true }).filter({ visible: true })
    ).toBeVisible()
    await expect(page.getByText(/Capacité d.investissement restante/)).toBeHidden()

    // Pas de card « Portefeuille du club » sur mobile (teaser desktop-only).
    // Scope `main` : la Sidebar (hors main, cachée sur mobile) porte le même libellé
    // dans son entrée de nav → strict mode sinon.
    await expect(page.getByRole('main').getByText('Portefeuille du club')).toBeHidden()
  })

  test('click MAX → aria-pressed bascule, axe en années, « depuis ton adhésion »', async ({
    page,
  }) => {
    const group = periodGroup(page)
    await group.getByRole('button', { name: 'MAX' }).click()

    await expect(group.getByRole('button', { name: 'MAX' })).toHaveAttribute('aria-pressed', 'true')
    await expect(group.getByRole('button', { name: '30J' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )

    // Période MAX : la série mensuelle démarre en 2018-01 → l'axe affiche l'année seule.
    await expect(page.getByText('2018', { exact: true }).filter({ visible: true })).toBeVisible()
    // Le résumé porte le suffixe « depuis ton adhésion » (i18n dashboard.evolution.sinceJoin).
    await expect(page.getByText('depuis ton adhésion').filter({ visible: true })).toBeVisible()
  })

  test('toggle : hit-area tactile ≥ 44px de haut (::before) et activation hors du pill', async ({
    page,
  }) => {
    // Le pill visuel fait h-7 (28px) : la cible tactile est étendue par un pseudo-élément
    // `before:h-11` (44px, centré verticalement). Le boundingBox du <button> ne reflète PAS
    // le pseudo-élément → on mesure la hit-area réelle via getComputedStyle(el, '::before')
    // et on PROUVE fonctionnellement l'extension (clic 6px AU-DESSUS du pill).
    // NB largeur : la hit-area horizontale = largeur du bouton (before:left-0 right-0),
    // soit ~40-50px selon le label — mesurée et annotée ci-dessous, non assertée (constat
    // pour la QA visuelle : seul l'axe vertical est garanti ≥ 44px par l'implémentation).
    const group = periodGroup(page)
    const buttons = group.getByRole('button')
    await expect(buttons).toHaveCount(2)

    const measures = await buttons.evaluateAll((els) =>
      els.map((el) => {
        const box = el.getBoundingClientRect()
        const before = window.getComputedStyle(el, '::before')
        return {
          label: el.textContent?.trim() ?? '',
          boxWidth: Math.round(box.width),
          boxHeight: Math.round(box.height),
          hitHeight: Number.parseFloat(before.height),
        }
      })
    )
    test
      .info()
      .annotations.push({ type: 'mesures-tap-target', description: JSON.stringify(measures) })
    for (const m of measures) {
      expect(m.hitHeight, `hit-area ::before de « ${m.label} »`).toBeGreaterThanOrEqual(44)
    }

    // Preuve fonctionnelle : un clic 6px au-dessus du bord du pill MAX (dans la zone
    // étendue de ±8px) active bien la période — la hit-area n'est pas décorative.
    const maxBtn = group.getByRole('button', { name: 'MAX' })
    await expect(maxBtn).toHaveAttribute('aria-pressed', 'false')
    const box = await maxBtn.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y - 6)
      await expect(maxBtn).toHaveAttribute('aria-pressed', 'true')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénarios 3, 4 : cookie v2 — desktop 1440×900
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Dashboard V2 — cookie v2, desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test.beforeEach(async ({ page, context }) => {
    await loginWithVariant(page, context, 'v2')
  })

  test('5 périodes + colonne droite (statut, position, teaser club → /portfolio)', async ({
    page,
  }) => {
    // Toggle : les 5 périodes sont visibles sur l'instance large (≥1024px).
    const group = periodGroup(page)
    await expect(group.getByRole('button')).toHaveCount(5)
    for (const label of ['7J', '30J', '90J', '1A', 'MAX']) {
      await expect(group.getByRole('button', { name: label })).toBeVisible()
    }
    await expect(group.getByRole('button', { name: '30J' })).toHaveAttribute('aria-pressed', 'true')

    // Titre dynamique du chart desktop : « Évolution · 30 jours » (réf) — suit la période.
    await expect(page.getByText('Évolution · 30 jours').filter({ visible: true })).toBeVisible()
    await group.getByRole('button', { name: 'MAX' }).click()
    await expect(page.getByText('Évolution · max').filter({ visible: true })).toBeVisible()

    // Hero desktop : label daté « Ta quote-part · au {date longue} » (réf : AU 11 JUIN 2026).
    // La date (anchorISO, RSC) n'est pas figée → motif générique « au <jour> <mois> <année> ».
    await expect(
      page.getByText(/Ta quote-part · au \d{1,2}(?:er)? \S+ \d{4}/).filter({ visible: true })
    ).toBeVisible()

    // Colonne droite : statut cotisation + card « Ma position ».
    await expect(page.getByText('Statut cotisation').filter({ visible: true })).toBeVisible()
    await expect(page.getByText('Ma position').filter({ visible: true })).toBeVisible()

    // Teaser « Portefeuille du club » : card-lien entière vers /portfolio.
    // Scope `main` : la Sidebar desktop a aussi un lien « Portefeuille du club »
    // (→ /portfolio) hors main → strict mode sinon.
    const teaser = page.getByRole('main').getByRole('link', { name: /Portefeuille du club/i })
    await expect(teaser).toBeVisible()
    await expect(teaser).toHaveAttribute('href', '/portfolio')
    await expect(teaser.getByText(/voir le détail/i)).toBeVisible()
  })

  test('« Comprendre ma quote-part » ouvre le dialog ; Escape ferme', async ({ page }) => {
    // Desktop : le hero n'est PAS cliquable ; le lien-bouton sous le montant ouvre le détail.
    await page.getByRole('button', { name: /Comprendre ma quote-part/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // Le titre du dialog réutilise « Ta quote-part » → recherche scopée au dialog.
    await expect(dialog.getByText('Ta quote-part')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénarios 6, 7 : V1 — cookie v1 explicite & fail-safe sans cookie (rollout 0)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Dashboard V1 — fail-safe', () => {
  test('cookie v1 explicite → pas de bloc Évolution, hero V1 en card', async ({
    page,
    context,
  }) => {
    await loginWithVariant(page, context, 'v1')

    // Marqueurs V2 ABSENTS du DOM (pas seulement cachés).
    await expect(page.getByText('Évolution', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Courbe illustrative')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Comprendre ma quote-part/i })).toHaveCount(0)

    // Hero V1 : card cliquable « Ta quote-part » (cf. dashboard.spec.ts).
    await expect(page.getByRole('button', { name: /Ta quote-part/i })).toBeVisible()
  })

  test('sans cookie (rollout 0) → V1 par défaut', async ({ page, context }) => {
    // Aucun cookie de variante : DASHBOARD_V2_ROLLOUT non posé en local → bucket 0 % → V1.
    await loginWithVariant(page, context, null)

    await expect(page.getByText('Évolution', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Courbe illustrative')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Ta quote-part/i })).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 8 : smoke axe (a11y) sur la V2 — pattern de a11y.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
const BLOCKING = new Set(['critical', 'serious'])

async function expectNoSeriousA11yViolations(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // Overlays dev-only — absents en prod (mêmes exclusions que a11y.spec.ts).
    .exclude('nextjs-portal')
    .exclude('[data-nextjs-toast]')
    .exclude('.tsqd-parent-container')
    .exclude('[aria-label*="Tanstack" i]')
    // ⚠ BUG PRÉ-EXISTANT (HORS périmètre V2, documenté pour le lead) : l'onglet ACTIF de
    // la BottomNav (packages/ui BottomNav.tsx:60, Sprint 4) est `text-brand-yellow`
    // (#FDC70C) sur fond card BLANC en thème light → contraste 1.57 < 4.5 (color-contrast
    // serious, RGAA 3.2.1). Invisible jusqu'ici : a11y.spec.ts ne scanne /dashboard qu'au
    // viewport desktop (BottomNav `md:hidden`). Exclusion CHIRURGICALE pour garder le
    // smoke V2 signifiant — à retirer quand le token actif light sera corrigé.
    .exclude('nav[aria-label="Navigation mobile"]')
    .analyze()

  const blocking = results.violations.filter((v) => BLOCKING.has(v.impact ?? ''))
  const summary = blocking.map((v) => `${v.id} (${v.impact}) × ${v.nodes.length} — ${v.help}`)
  expect(blocking, `Violations a11y bloquantes sur ${label} :\n${summary.join('\n')}`).toEqual([])
}

test.describe('A11y — Dashboard V2 (axe)', () => {
  test.describe('mobile', () => {
    test.use({ viewport: { width: 375, height: 812 }, hasTouch: true })

    test('/dashboard V2 mobile — 0 violation critical/serious', async ({ page, context }) => {
      await loginWithVariant(page, context, 'v2')
      await expect(periodGroup(page)).toBeVisible()
      await expectNoSeriousA11yViolations(page, '/dashboard V2 (mobile)')
    })
  })

  test.describe('desktop', () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test('/dashboard V2 desktop — 0 violation critical/serious', async ({ page, context }) => {
      await loginWithVariant(page, context, 'v2')
      await expect(periodGroup(page)).toBeVisible()
      await expectNoSeriousA11yViolations(page, '/dashboard V2 (desktop)')
    })
  })
})
