/**
 * Tests E2E — garde anti-zoom iOS sur les champs de formulaire.
 *
 * iOS Safari (et Chrome iOS) zoome AUTOMATIQUEMENT sur un champ de saisie focusé dont le
 * `font-size` calculé est < 16px. Ce zoom intempestif casse la mise en page (notamment en
 * PWA plein écran) et nuit à l'accessibilité. La parade standard : viser ≥ 16px sur mobile
 * (`text-[16px] md:text-[14px]` — 16px sous md, 14px à partir de md où le zoom ne s'applique
 * pas). L'atome Input applique déjà ce pattern (packages/ui/src/atoms/Input/Input.tsx:11-12).
 *
 * Cette spec scanne au VIEWPORT MOBILE (390×844, iPhone-ish) une LISTE de routes (publiques +
 * authentifiées membre + une route admin) ET le textarea du widget Feedback : elle sélectionne
 * tous les champs de saisie VISIBLES et activables (input texte, textarea, select), calcule leur
 * `font-size` effectif et REMONTE tout champ < 16px, avec un message verbeux (tag/id/name/
 * classes/px calculés) pour guider la correction. La garantie n'est donc PAS « tout input
 * partout », mais « tout champ visible sur les routes listées + le FeedbackSheet ». Un nouvel
 * input sur une route non listée n'est couvert que si on ajoute la route ici.
 *
 * Le widget Feedback (textarea derrière l'icône « Retour » de l'AppTopbar) n'est PAS dans le
 * DOM au chargement : on l'OUVRE explicitement sur une route authentifiée avant de scanner,
 * pour couvrir le textarea du FeedbackSheet (c'était le cas du bug d'origine, `text-[14px]`).
 *
 * Stratégie d'auth : identique à cursor-pointer.spec.ts — `loginAsSeedMember` connecte le
 * membre seed et marque l'onboarding terminé. Pour /admin/*, on élève le seed en 'treasurer'
 * le temps de la suite (helper postgres `setSeedRole`, repris de cursor-pointer.spec.ts).
 * Exécution sérielle (workers:1).
 *
 * Réf : CLAUDE.md (a11y AA, cibles tactiles, PWA), Input.tsx (pattern anti-zoom), helpers.ts,
 * cursor-pointer.spec.ts (structure de scan + élévation trésorier).
 */

import { test, expect, type Page } from '@playwright/test'
import postgres from 'postgres'

import { loginAsSeedMember, SEED_EMAIL } from './helpers'

// Viewport mobile « iPhone-ish » : c'est SOUS md (Tailwind md = 768px) que le zoom iOS
// s'applique, donc c'est là qu'on vérifie le font-size effectif.
const MOBILE_VIEWPORT = { width: 390, height: 844 }

// Seuil iOS : tout champ focusable < 16px déclenche le zoom auto.
const MIN_FONT_SIZE_PX = 16

// Élévation trésorier pour scanner /admin/* (pattern repris de cursor-pointer.spec.ts).
const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const SEED_CLUB_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

// ─────────────────────────────────────────────────────────────────────────────
// Sélecteur des champs de saisie concernés par le zoom iOS
// ─────────────────────────────────────────────────────────────────────────────
//
// On cible les champs où l'utilisateur SAISIT du texte (donc focus → zoom potentiel) :
//   - <input> de saisie (on exclut hidden/checkbox/radio/file/submit/button/reset : pas de
//     zoom de saisie possible, ou non visibles) ;
//   - <textarea> ;
//   - <select> (iOS zoome aussi sur un select < 16px à l'ouverture du picker).
// On exclut les désactivés et, au scan, les éléments masqués (offsetParent null / hidden).
const FIELD_SELECTOR = [
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
].join(', ')

type Offender = {
  route: string
  tag: string
  type: string | null
  id: string | null
  name: string | null
  classes: string
  fontSize: string
  fontSizePx: number
}

/**
 * Scanne la page courante et renvoie les champs visibles dont le `font-size` calculé est
 * < 16px (zoom iOS au focus). Le détail (tag/type/id/name/classes/px) sert au diagnostic.
 */
async function findFontSizeOffenders(page: Page, route: string): Promise<Offender[]> {
  const raw = await page.evaluate(
    ({ selector, min }) => {
      const out: Array<{
        tag: string
        type: string | null
        id: string | null
        name: string | null
        classes: string
        fontSize: string
        fontSizePx: number
      }> = []
      const els = Array.from(document.querySelectorAll<HTMLElement>(selector))
      for (const el of els) {
        const style = getComputedStyle(el)
        // Exclure les champs masqués (repliés / hors flux) → évite le bruit.
        const hidden =
          el.offsetParent === null || style.display === 'none' || style.visibility === 'hidden'
        if (hidden) continue
        const px = parseFloat(style.fontSize)
        if (!Number.isFinite(px) || px >= min) continue
        out.push({
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute('type'),
          id: el.getAttribute('id'),
          name: el.getAttribute('name'),
          classes: el.getAttribute('class') ?? '',
          fontSize: style.fontSize,
          fontSizePx: px,
        })
      }
      return out
    },
    { selector: FIELD_SELECTOR, min: MIN_FONT_SIZE_PX }
  )

  return raw.map((r) => ({ route, ...r }))
}

/** Formate les offenders en message d'erreur verbeux, prêt à guider une correction. */
function formatOffenders(offenders: Offender[]): string {
  const lines = offenders.map((o, i) => {
    const type = o.type ? ` type="${o.type}"` : ''
    const id = o.id ? ` id="${o.id}"` : ''
    const name = o.name ? ` name="${o.name}"` : ''
    return [
      `  [${i + 1}] <${o.tag}${type}${id}${name}>  font-size=${o.fontSize} (${o.fontSizePx}px)`,
      `      route : ${o.route}`,
      `      class : ${o.classes || '(aucune)'}`,
    ].join('\n')
  })
  return (
    `${offenders.length} champ(s) de saisie avec font-size < ${MIN_FONT_SIZE_PX}px ` +
    `(zoom auto iOS au focus) :\n${lines.join('\n')}\n\n` +
    `→ Corriger : viser ≥16px sur mobile, ex. \`text-[16px] md:text-[14px]\` ` +
    `(cf. atome Input packages/ui/src/atoms/Input/Input.tsx:11-12).`
  )
}

/** Charge la route, attend le réseau au repos, scanne, et asserte 0 offender. */
async function assertNoFontSizeOffenders(page: Page, route: string): Promise<void> {
  await page.goto(route)
  await page.waitForLoadState('networkidle')
  const offenders = await findFontSizeOffenders(page, route)
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
// Bloc 1 — Routes PUBLIQUES (sans auth) — champs de saisie au repos
// ─────────────────────────────────────────────────────────────────────────────

test.describe('font-size ≥16px (anti-zoom iOS) — routes publiques', () => {
  test.use({ viewport: MOBILE_VIEWPORT })

  // /login : champ e-mail (atome Input). Les autres routes publiques peuvent ne porter aucun
  // champ ; le scan asserte alors trivialement 0 offender (non bruyant).
  // NB : /verifier est une route DYNAMIQUE (/verifier/[ref]) — le chemin nu rend un not-found et
  // ne porte de toute façon aucun champ de saisie ; on ne la liste donc pas (scan inutile).
  const PUBLIC_ROUTES = ['/', '/login', '/login/check-email']

  for (const route of PUBLIC_ROUTES) {
    test(`${route} → tous les champs visibles en font-size ≥16px`, async ({ page }) => {
      await assertNoFontSizeOffenders(page, route)
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Bloc 2 — Widget Feedback (textarea derrière l'AppTopbar) — le cas du bug
// ─────────────────────────────────────────────────────────────────────────────

test.describe('font-size ≥16px (anti-zoom iOS) — widget Feedback', () => {
  test.use({ viewport: MOBILE_VIEWPORT })

  // Le textarea du FeedbackSheet n'est rendu QU'APRÈS ouverture du sheet (déclenché par
  // l'icône « Retour »/« Feedback » de l'AppTopbar). On se connecte, on ouvre le sheet,
  // puis on scanne le dialog : c'est ce textarea qui portait `text-[14px]` (bug iOS).
  test('le textarea du widget Feedback est en font-size ≥16px sur mobile', async ({ page }) => {
    await loginAsSeedMember(page) // connecte + onboarding=true + charge /dashboard

    // Ouvre le widget via l'icône AppTopbar (aria-label « Retour » FR / « Feedback » EN).
    const trigger = page.getByRole('button', { name: /Retour|Feedback/ })
    await trigger.first().click()

    // Le textarea du sheet (label « Ton message » FR / « Your message » EN) doit être visible.
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('textbox').first().waitFor({ state: 'visible' })

    const offenders = await findFontSizeOffenders(page, '/dashboard (FeedbackSheet ouvert)')
    expect(offenders, offenders.length ? formatOffenders(offenders) : '').toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Bloc 3 — Routes AUTHENTIFIÉES — champs au repos (profil, etc.)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('font-size ≥16px (anti-zoom iOS) — routes authentifiées', () => {
  test.use({ viewport: MOBILE_VIEWPORT })

  // Le membre seed est élevé en 'treasurer' pour autoriser /admin/* ; remis à 'member' après.
  test.beforeAll(async () => {
    await setSeedRole('treasurer')
  })

  test.afterAll(async () => {
    await setSeedRole('member')
  })

  // Routes de l'espace membre + une route admin portant un champ de saisie.
  // NB : /profil est en LECTURE SEULE (un <dl> + l'avatar) — il ne porte aucun champ texte
  //      (l'<input type=file> caché de l'avatar est exclu du sélecteur) → scan no-op, gardé en
  //      filet pour capter une future régression.
  //      /admin/invitations : au repos, on scanne l'input e-mail de l'InviteForm (atome Input,
  //      déjà ≥16px). L'input « lien à copier » (readOnly mais focusable → zoom iOS si < 16px,
  //      corrigé à 16px md:13px dans cette passe) n'apparaît qu'APRÈS création d'une invitation ;
  //      il n'est donc scanné par cette route que si un lien est présent dans le DOM. La garantie
  //      durable sur cet input vit dans le code (la classe corrigée), pas seulement dans ce scan.
  const AUTH_ROUTES = [
    '/dashboard',
    '/portfolio',
    '/contributions',
    '/profil',
    '/admin/invitations',
  ]

  for (const route of AUTH_ROUTES) {
    test(`${route} → tous les champs visibles en font-size ≥16px`, async ({ page }) => {
      await loginAsSeedMember(page)
      await assertNoFontSizeOffenders(page, route)
    })
  }
})
