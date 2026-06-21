# QA_REPORT — Vague NET-B+ (2026-06-21)

**Branche :** `feat/net-b-vague` (depuis `main`) · **Verdict global : ✅ PASS** · **Push : en attente de l'owner.**

Orchestration LEAD (décompose → dispatche → boucle dev/test/QA/fix → arbitre). 9 tickets livrés, 13 commits FR atomiques, gate statique + Deno + RLS + e2e + visuel light/dark prouvés (sorties réelles).

## Synthèse par couche (preuves réelles)

| Couche                                    | Résultat                                                                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Lint**                                  | `make lint` → 0 erreur (2 warnings préexistants `withAudit.test.ts`)                                                             |
| **Typecheck**                             | `make typecheck` → 7/7 workspaces, exit 0                                                                                        |
| **Unit/Intégration**                      | `make test` → utils **81**, data **221** (+29 skip RLS), ui **613**, web **495** — exit 0                                        |
| **Deno (Edge sync)**                      | **43/43** passed (gardes NET-018 club désactivé + ADM-008 rôle `manual` + collapse-guard préservés)                              |
| **RLS isolation**                         | **29/29** passed (DB up) — club désactivé hors `get_user_club_ids`, feedback staff club A≠B, membre = ses seuls retours          |
| **E2E Playwright** (`--workers=1`, :3011) | **40/40** passed : club-switcher 4, cursor-pointer 16, a11y 5, access 8, admin 5, reseau-access 2, reseau-add-club 1, feedback 1 |
| **Visuel runtime light/dark**             | 7 surfaces, 6 conformes ≥96 % + skeleton dark corrigé (token thémé)                                                              |

## Tickets livrés

| Ticket      | Objet                                                         | Migration                                                                                           | Verdict                                        |
| ----------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **OPS-006** | Retrait complet Cloudflare Analytics (full GA4)               | —                                                                                                   | ✅ CONVERGÉ                                    |
| **PWA-002** | Skeleton de boot brandé `(app)/loading.tsx` (anti-écran-noir) | —                                                                                                   | ✅ (skeleton thémé dark après QA)              |
| **NAV-001** | Sélecteur de club dans le menu avatar (mobile + desktop)      | —                                                                                                   | ✅ (ARIA `<ul>/<li>` + e2e fiabilisé après QA) |
| **NET-018** | Désactivation/réactivation d'un club par le network admin     | **050** `clubs.is_active` + `get_user_club_ids` + RPC `network_set_club_active` + garde Edge sync   | ✅                                             |
| **NET-019** | Console des retours réseau `/reseau/retours`                  | **051** `feedback.club_id` + RLS resserrée + UPDATE statut réseau                                   | ✅                                             |
| **ADM-008** | Éditeur de rôle club in-app + anti-écrasement sync            | **052** `memberships.role_source` + RPC `admin_change_member_role` (staff-par-club + anti-escalade) | ✅                                             |
| **OPS-007** | Socle audit-log `withAudit()` + câblage 15 actions            | **053** `audit_log` (append-only, write SECURITY DEFINER)                                           | ✅                                             |
| **ADM-009** | Console des retours scopée bureau de club `/admin/retours`    | **054** policy UPDATE statut staff-par-club                                                         | ✅                                             |
| **NET-020** | Gestion des rôles réseau `/reseau/bureau` (write)             | **055** RPC read `network_list_board` / `network_list_eligible_members`                             | ✅                                             |

## Sécurité (décisions owner appliquées)

- **NET-018** : un club désactivé sort de `get_user_club_ids()` → matrice + sync inaccessibles à TOUS ses membres ; aucune donnée supprimée. RPC réservée `is_network_admin()`. Garde Edge sync (early-return, le cron ne tombe pas).
- **Feedback RLS resserrée** (décision owner) : membre réseau lit tout ; **staff d'un club = SON club uniquement** (corrige la policy globale `staff read all` préexistante) ; membre = ses propres retours. UPDATE statut : réseau (051) + staff-par-club (054, fail-closed `has_club_staff_access`).
- **ADM-008** : RPC gardée staff-par-club + **anti-escalade** (un trésorier ne peut pas nommer un président). Rôle `manual` non réécrit par la sync.
- **OPS-007** : `withAudit` **fire-and-forget** — un échec de log n'échoue JAMAIS la mutation (prouvé par tests : RPC en erreur + RPC qui throw → action OK). 15 actions sensibles câblées, sans PII (pas d'email/sheet_id/titre journalisés).
- **Tokens** : 0 occurrence de `#E93E3A` pour sévérité/négatif/destructif dans les fichiers de la vague (token `--color-data-negative-500`). cursor-pointer 16/16, cibles ≥44px.

## Findings QA résolus

1. **NAV-001 ARIA** : `role="listitem"` sur `<button>` → restructuré en `<ul>/<li>` (jest-axe vert).
2. **club-switcher e2e** : helper écrivait `is_active` (GENERATED) → `status` (`active`/`left`) ; test multi-club découplé de la RLS admin (viewport mobile masque la sidebar) + helper `openAvatarMenu` anti click-before-hydration → 4/4 stable.
3. **Skeleton dark** : `bg-neutral-200` non thémé → `bg-border` (light identique `#E4E4DF`, dark `#2D2A2B`).

## Points à surveiller (non bloquants)

- **CSP GA4** : `googletagmanager.com` n'est pas explicitement allowlisté dans `next.config.ts` (couvert par `'unsafe-inline'` en dev, `img-src https:` en prod). Lacune **préexistante** (≠ OPS-006). À durcir lors d'un futur ticket CSP/nonce.
- **NET-020 badge « LECTURE SEULE »** (rôle `network_board`) non photographié runtime (pas de user `network_board` distinct dans le seed). Logique couverte par tests ; vérif visuelle à faire au prochain seed étendu.

## Reporté hors vague (acté)

- **Digest IA agrégé** des consoles feedback → **NET-017 / NET-C** (rendu « Bientôt » via `ComingSoonCard`).
- Widget iOS natif, navigation offline → hors vague.

## ⚙️ Actions owner

1. **Migrations prod** : appliquer **050 → 055** en prod (`make db-migrate`) — ⚠ commande prod.
2. **Redeploy Edge `sync`** (gardes club désactivé + rôle `manual`).
3. **Redeploy `apps/web`** (Vercel) — retrait Cloudflare, nouvelles routes `/reseau/retours`, `/reseau/bureau`, `/admin/retours`.
4. **Vercel env** : retirer `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN`.
5. **Push** de `feat/net-b-vague` + PR vers `main` (sur demande).
6. (Optionnel) seed `network_board` pour valider visuellement le badge LECTURE SEULE.
