# Cahier des charges — User Behavior Analytics (UBA)

> **Statut :** v1 — 2026-06-10
> **Périmètre :** deux produits — la **vitrine** (`apps/vitrine`, marketing public) et l'**app membre** (`apps/web`, dashboard financier authentifié) + les features à venir du backlog.
> **Décision outillage :** **Google Analytics 4 (GA4) uniquement.** Pas de PostHog/Amplitude/Mixpanel/session-replay.
> **Produit financier :** la **minimisation des données et la confiance priment** sur toute optimisation d'engagement.

Ce document est la **source de vérité stratégique** : _quoi_ mesurer, _pourquoi_, et _comment décider_ à partir de la donnée. Les détails opérationnels vivent dans les documents liés :

| Doc                                                                         | Contenu                                                                                                  |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **[01 — Plan de taggage](./PLAN-DE-TAGGAGE.md)**                            | Catalogue canonique d'events, user properties, dimensions, conventions, checklist anti-PII               |
| **[02 — Bannière de consentement (spec)](./BANNIERE-CONSENTEMENT-SPEC.md)** | Variantes, tokens exacts, switch par variable d'env, défaut, Consent Mode v2, gate de fidélité QA ≥ 97 % |
| **[03 — Brief développeur](./BRIEF-DEVELOPPEUR.md)**                        | Instructions d'implémentation phasées (P1→P4), chemins de fichiers, gates d'acceptation                  |

> ⚠️ `docs/analytics.md` (Cloudflare Web Analytics, « pas de bandeau requis ») devient **caduc** : GA4 pose des cookies → bandeau RGPD **obligatoire**. À mettre à jour ou archiver lors de l'implémentation.

---

## 1. Pourquoi — objectifs de la démarche

On ne sait aujourd'hui **rien** du comportement réel des utilisateurs : Cloudflare Web Analytics ne donne que des pages vues, sans events, sans funnels, sans parcours. On veut répondre à des questions produit concrètes :

- **Vitrine** : d'où viennent les visiteurs, quels contenus convertissent, où abandonne-t-on le formulaire de contact / la newsletter, et **quels canaux produisent les membres qui restent**.
- **App** : où décroche-t-on pendant l'onboarding, quelles fonctionnalités sont réellement utilisées vs ignorées, qu'est-ce qui fait **revenir** un membre, et l'espace admin réduit-il vraiment la charge des trésoriers.
- **Pont entre les deux** : mesurer le parcours complet _prospect → membre activé → membre fidèle_.

Le tout en restant **strictement conforme RGPD/CNIL** et en ne faisant **jamais transiter de donnée financière ou personnelle** vers Google.

---

## 2. Architecture de mesure — décision

**1 propriété GA4 → 2 flux de données → 2 Measurement IDs.**

| Flux        | Measurement ID                        | Domaine                                        | `user_id`                         | Posture                                                             |
| ----------- | ------------------------------------- | ---------------------------------------------- | --------------------------------- | ------------------------------------------------------------------- |
| **Vitrine** | `G-LP0PW78BQ5` (existant)             | `reseauevolvecapital.com`                      | non (anonyme)                     | Acquisition / SEO, enhanced measurement complet                     |
| **App**     | **à créer** (2ᵉ flux, même propriété) | `app.reseauevolvecapital.com` (domaine Vercel) | **oui** — UUID Supabase **haché** | Strict : pas de Google Signals, redaction d'URL, valeurs en buckets |

### Pourquoi ce découpage (et pas autre chose)

- **Une seule propriété + cross-domain** = le parcours _vitrine → app_ reste **cousu** (`client_id` partagé entre domaines, puis stitching par `user_id` au login). C'est la condition pour répondre à « d'où viennent les membres qui restent ». **Deux propriétés séparées trancheraient ce funnel — irréparable.**
- **Deux flux** = données **propres par produit** (un site marketing et un dashboard financier ne se mélangent pas) **et** posture vie privée différenciée (règles strictes sur le seul flux app).
- **Un seul ID partagé** forcerait du filtrage par hostname dans chaque rapport et empêcherait de séparer audience publique / membres — fragile et sale.

> 🔧 **Action owner (console GA4, ~5 min) :** dans la **même propriété** que `G-LP0PW78BQ5`, créer un **2ᵉ flux Web** pour le domaine de l'app → récupérer le nouveau `G-XXXX`. Le code lira `NEXT_PUBLIC_GA_ID_VITRINE` et `NEXT_PUBLIC_GA_ID_APP`.

Détails de config (enhanced measurement par flux, cross-domain, exclusions de référents, rétention 14 mois, Google Signals OFF, export BigQuery EU) → **[Brief développeur §Config GA4](./BRIEF-DEVELOPPEUR.md)**.

---

## 3. Quoi mesurer — et pourquoi (synthèse des 5 lentilles experts)

### 3.1 Taxonomie canonique (extrait — catalogue complet dans le plan de taggage)

Convention : `snake_case`, verbe d'**état** pour les écrans (`_viewed`), verbe d'**action** pour les interactions (`_submit`/`_click`/`_download`). Paramètre `app_surface` (`vitrine`|`app`) sur tout. **Jamais** d'email/nom/montant exact/ref ; montants en **buckets**, `user_id` = UUID haché.

**6 conversions clés (key events) :**

| Key event                | Produit | Sens                       |
| ------------------------ | ------- | -------------------------- |
| `contact_form_submit`    | vitrine | lead capté                 |
| `newsletter_signup`      | vitrine | lead capté                 |
| `login_completed`        | app     | auth réussie               |
| `onboarding_completed`   | app     | compte réellement activé   |
| `portfolio_viewed` (1ʳᵉ) | app     | **moment « aha »**         |
| `attestation_download`   | app     | usage du livrable à valeur |

> Le catalogue complet (~50 events vitrine + app + features à venir, avec paramètres, déclencheurs et objectif analytique) est dans **[PLAN-DE-TAGGAGE.md](./PLAN-DE-TAGGAGE.md)**.

### 3.2 Parcours, funnels & abandons (lentille Product Analyst)

**Moment d'activation (« aha ») retenu : la 1ʳᵉ `portfolio_viewed` dans les 7 jours qui suit `onboarding_completed`.**
Justification : le produit est un dashboard patrimonial ; la valeur perçue naît quand le membre **voit concrètement sa quote-part valorisée**, pas quand il crée un compte (`login_completed`) ni quand il voit un écran d'accueil (`dashboard_viewed`).

**Funnels à construire dans GA4 :**

1. **Acquisition vitrine — contact** : `session_start` → engagement (≥2 pages / `engaged_session`) → `contact_form_start` (focus 1er champ) → `contact_form_submit`. Segmenté par `source/medium`, `landing_page`, `device`, `locale`.
2. **Newsletter** : `newsletter_prompt_view` (`surface=popup|inline|footer`) → `newsletter_signup_start` → `newsletter_signup`. Le `surface` tranche « le popup convertit-il ou agace-t-il ».
3. **Lecture blog → conversion** : `page_view(blog)` → `blog_article_view` → `blog_article_read` (scroll ≥75 % ou ≥30 s) → conversion (`newsletter_signup`/`contact_form_submit`/`cta_click`).
4. **Activation app** (sur `user_id`) : `invite_opened` → `invite_accepted` → `login_completed` → `onboarding_step_completed×3` → `onboarding_completed` → 1ʳᵉ `dashboard_viewed` → **1ʳᵉ `portfolio_viewed` (aha)** → 1ʳᵉ `attestation_download`.
5. **Pont vitrine → app** : `cta_click(cta_target=devenir_membre)` (vitrine) → `login_completed` (app) dans la même session cross-domain, puis stitching `user_id` pour rattacher `first_user_source`.

**Abandons surveillés :** drop par étape d'onboarding, abandon de formulaire (champ par champ via `form_field_abandon`), magic link demandé jamais cliqué, boucles de navigation (path exploration), drop après « aha ».

### 3.3 Rétention & North Star (Product Analyst + Data Analyst)

- **App — North Star :** _nombre de membres ayant consulté leur portefeuille valorisé ≥ 1× sur 30 j_ (`portfolio_viewed`, dédup `user_id`). Aligné sur le « aha », pas sur la durée de session (cadence patrimoniale = mensuelle, pas quotidienne).
- **Vitrine — North Star :** _leads qualifiés / mois_ = `contact_form_submit` + `newsletter_signup`, segmentés par source.
- **Cohortes :** rétention de connexion (hebdo + mensuelle), rétention par feature (`portfolio_viewed` vs `contribution_viewed`), croisement avec le cycle de cotisation et l'email mensuel d'attestation.

### 3.4 Pilotage produit (lentille Product Manager)

- **Politique « le tracking fait partie de la Definition of Done »** : aucune feature ne passe en _Done_ sans sa spec d'instrumentation dans le ticket + preuve runtime en GA4 DebugView (au même titre que le rendu light/dark et la parité fr/en déjà exigés par `CLAUDE.md`). Template fourni dans le plan de taggage.
- **Framework métrique → décision** (extrait) :

| Signal                                              | Surface              | Décision déclenchée                          |
| --------------------------------------------------- | -------------------- | -------------------------------------------- |
| Drop fort `onboarding_step_2 → step_3`              | onboarding (AUT-006) | rendre photo/adresse skippables, A/B wording |
| `magic_link_requested → completed` < 60 %           | login (AUT-002/004)  | revoir mail, expiry, délivrabilité Brevo     |
| `attestation_download` < 25 % des actifs            | NTF-004              | remonter le CTA, pousser via email mensuel   |
| `dashboard_viewed` haut mais `portfolio_viewed` bas | DSH-005 / PFT-004    | renforcer le CTA « Voir le portefeuille »    |
| Hausse arrivées `/acces-suspendu`                   | ADM-007              | alerte relation, revue trésorier             |

- **Contre-métriques (produit financier) :** taux de désabonnement, arrivées `/acces-suspendu`, taux de **refus** de consentement (métrique de confiance à part entière). **Jamais** de métrique de « temps passé » comme objectif ; jamais de dark-pattern sur le consentement ou les notifications.

### 3.5 Recherche UX — quanti + quali sans vendor (lentille UX Researcher)

GA4 ne fait **ni session replay ni heatmap** — limite **assumée**. On la compense :

- **Proxies de friction (events custom)** : `rapid_repeat_click` (rage-click), `dead_click`, `error_encountered` (états error/empty), `live_value_failed` (échec valo live), `form_field_abandon`, `nav_loop`. Agrégés par route × device × thème → un « top écrans qui frustrent » = notre substitut de heatmap. (Échantillonnés + plafonnés par session pour ne pas exploser le quota.)
- **Programme qualitatif maison** : tests d'utilisabilité modérés (5 participants/série, 1/sprint), recrutement depuis les vrais membres par rôle, **micro-sondage in-app** (`<MicroSurvey>` → réponse bucketée en event + stockage Supabase RLS, RGPD-aware), widget feedback, test « 5 secondes » sur la vitrine.
- **Boucle mixed-method** : le quanti dit _où_ ça casse (funnel/proxy) → le quali dit _pourquoi_ (entretien ciblé sur le segment qui souffre) → on itère → **on re-mesure** (même funnel, même segment, critère de succès défini _avant_).
- **A11y comportementale (barre RGAA AA, AAA chiffres-clés)** : `rapid_repeat_click`/`dead_click` × mobile = cibles tactiles trop petites ; user property `reduced_motion` ; tests clavier-seul. GA4 est faible sur l'a11y → repose majoritairement sur le quali + les gates techniques existants (jest-axe, `cursor-pointer.spec`, Lighthouse).

---

## 4. RGPD / consentement (résumé — spec complète liée)

- **Google Consent Mode v2**, default **denied** (`analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization`), posé **inline dans le `<head>` avant GA**, région EU/EEA. Avant choix : zéro cookie, seulement des pings modélisés.
- **Bannière « Tout accepter / Tout refuser / Personnaliser »**, _Refuser_ à **prominence égale** d'_Accepter_ (exigence CNIL). « Personnaliser » → toggles _Nécessaires [verrouillé]_ / _Mesure d'audience_. Choix persisté en cookie 1ʳᵉ partie ≤ 6 mois.
- `user_id` **jamais** posé sans consentement. Variantes visuelles + tokens exacts + switch d'env + défaut → **[BANNIERE-CONSENTEMENT-SPEC.md](./BANNIERE-CONSENTEMENT-SPEC.md)**.

---

## 5. Reporting & exploitation (lentille Data Analyst)

- **Cadences :** quotidien (santé tracking + acquisition), hebdo (funnels activation/onboarding, adoption features, engagement par rôle), mensuel (cohortes de rétention, scorecard exécutif, vue par club).
- **Toujours en buckets/comptages**, jamais en € exacts. Chaque KPI distingue **données consenties** vs **modélisées** (Consent Mode) — jamais mélangées sans label.
- **Export BigQuery EU (gratuit, recommandé ON)** : c'est la pièce qui réconcilie minimisation et analyse riche. GA ne reçoit que `user_id` pseudonyme + buckets ; les données sensibles restent dans Supabase ; on **joint sur le `user_id` haché dans BigQuery** (LTV, usage × patrimoine) **sans jamais envoyer un euro à GA**. Dataset en région `EU`.
- **Dictionnaire de métriques** verrouillé (DAU/WAU/MAU sur 28 j glissants, stickiness, activation J7, rétention D1/D7/D30 + M1, proxy de churn, conversion vitrine→membre) → détaillé dans le plan de taggage.

---

## 6. Roadmap d'implémentation

| Phase                                           | Contenu                                                                                                                                                                                 | Touche la vitrine ?                                |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **P1 — Socle GA4 + consentement**               | `@next/third-parties`, Consent Mode v2, bannière (app + vitrine, variantes + switch env, défaut compact-gauche, **QA ≥ 97 %**), env vars, recâblage des `trackEvent()` no-op sur `gtag` | **Oui** → confirmation owner requise (`CLAUDE.md`) |
| **P2 — Key events + funnels**                   | les 6 conversions + funnels activation/acquisition + user properties + dimensions enregistrées                                                                                          | partiel                                            |
| **P3 — Couverture complète + proxies friction** | reste du catalogue, `rapid_repeat_click`/`dead_click`/`error_encountered`, Web Vitals                                                                                                   | oui                                                |
| **P4 — Avancé (optionnel, documenté)**          | export BigQuery EU + join Supabase pseudonyme, `<MicroSurvey>`, pont Brevo→GA4                                                                                                          | non                                                |

Détail exécutable → **[BRIEF-DEVELOPPEUR.md](./BRIEF-DEVELOPPEUR.md)**.

---

## 7. Garde-fous non négociables (rappel)

1. **Zéro PII, zéro montant exact** vers GA — buckets uniquement, `user_id` haché. Checklist bloquante avant tout merge d'instrumentation.
2. **Pas de tracking sans consentement** (hors pings Consent Mode default-denied).
3. **La vitrine ne casse jamais** — ajouts additifs, confirmation owner avant de toucher ses fichiers de prod.
4. **`Refuser` aussi facile qu'`Accepter`** (CNIL).
5. **Google Signals OFF** sur le flux app.
6. Le quanti GA4 ne décide jamais seul — croisé avec le quali avant d'entrer au backlog.
