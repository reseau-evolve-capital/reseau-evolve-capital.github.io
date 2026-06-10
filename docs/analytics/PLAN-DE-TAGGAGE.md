# Plan de taggage GA4 — catalogue canonique

> Référence d'implémentation. Tout event/paramètre/dimension **doit** figurer ici avant d'être codé (gate de gouvernance). Lié au **[Cahier des charges](./CAHIER-DES-CHARGES-UBA.md)**.

## 0. Conventions (non négociables)

- **`snake_case`**, ≤ 40 caractères ; ≤ 25 paramètres/event ; valeurs de paramètre ≤ 100 caractères.
- Verbe d'**état** pour les écrans (`_viewed`), verbe d'**action** pour les interactions (`_submit`, `_click`, `_download`, `_changed`).
- **Events recommandés GA4** réutilisés quand un nom canonique existe (`login`, `sign_up`, `search`, `select_content`, `file_download`).
- **Paramètres communs sur tous les events** : `app_surface` (`vitrine` | `app` | `public_verify`), `locale` (`fr`|`en`), `theme` (`light`|`dark`).
- **Valeurs catégorielles bornées** (enum) plutôt que texte libre. Buckets suffixés `_bucket`.
- **Anti-PII (cf. §5)** : jamais email/nom/téléphone/IBAN/ref/montant exact en paramètre ou user property.
- On **réécrit le corps** des helpers no-op existants (`apps/web/lib/analytics.ts`, `apps/vitrine/src/lib/analytics.ts`) pour pousser vers `window.gtag('event', name, params)` ; on abandonne la forme UA `{category, action, label}`.

---

## 1. Enhanced measurement (activation par flux)

| Mesure                     | Flux vitrine | Flux app | Note                                                                                                                                                  |
| -------------------------- | ------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `page_view`                | ✅           | ✅       | App = SPA → activer la détection des événements d'historique du navigateur ; pousser `page_view` manuel sur transition `next/navigation` si raté.     |
| `scroll` (90 %)            | ✅           | ❌       | App : instrumenter nos jalons (blog vitrine).                                                                                                         |
| `click` sortant            | ✅           | ✅       |                                                                                                                                                       |
| `view_search_results`      | ✅           | ❌       | recherche blog.                                                                                                                                       |
| `file_download`            | ✅           | **OFF**  | App : l'attestation est une route API → instrumenter `attestation_download` manuellement (l'auto-capture loggerait un nom de fichier porteur de ref). |
| `form_start`/`form_submit` | **OFF**      | **OFF**  | Remplacés par events custom explicites (pas de payload de champ).                                                                                     |
| `video_*`                  | ❌           | ❌       | pas de vidéo embarquée.                                                                                                                               |

---

## 2. Catalogue d'events — Vitrine

Routes : `/[locale]/`, `/about`, `/blog`, `/blog/[slug]`, `/blog/category/[id]`, `/clubs/[clubId]`, `/contact`, `/legal/*`.

| Event                        | Paramètres                                                                         | Déclencheur                                      | Objectif                          |
| ---------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------- |
| `contact_form_start`         | `form_location` (`contact_page`\|`footer`\|`club`)                                 | focus 1er champ `/contact`                       | intention de contact              |
| **`contact_form_submit`** 🎯 | `form_location`                                                                    | submit OK (→ Apps Script)                        | **conversion lead**               |
| `contact_form_error`         | `error_type` (`validation`\|`network`\|`script`)                                   | échec submit                                     | friction                          |
| `form_field_abandon`         | `form_id`, `last_field`, `fields_completed_count`                                  | focus puis blur sans valeur / sortie sans submit | friction par champ                |
| `newsletter_prompt_view`     | `surface` (`popup`\|`inline`\|`footer`)                                            | affichage du prompt/popup                        | pression vs valeur du popup       |
| `newsletter_signup_start`    | `surface`                                                                          | focus email                                      | début                             |
| **`newsletter_signup`** 🎯   | `surface`                                                                          | submit OK                                        | **conversion lead**               |
| `newsletter_signup_error`    | `error_type`                                                                       | échec                                            | friction                          |
| `blog_article_view`          | `article_slug`, `article_category`                                                 | render `/blog/[slug]`                            | popularité contenu                |
| `blog_article_read`          | `article_slug`, `read_percent` (`25`\|`50`\|`75`\|`100`)                           | jalons de scroll                                 | profondeur de lecture             |
| `blog_category_view`         | `category_id`                                                                      | render `/blog/category/[id]`                     | intérêt par thème                 |
| `blog_search`                | `search_term` (sanitizé)                                                           | recherche blog                                   | demande de contenu                |
| `cta_click`                  | `cta_id`, `cta_location`, `cta_target` (`devenir_membre`\|`espace_membre`\|…)      | clic CTA                                         | efficacité acquisition / **pont** |
| `club_view`                  | `club_id`                                                                          | render `/clubs/[clubId]`                         | intérêt par club                  |
| `lang_switch`                | `from_locale`, `to_locale`                                                         | toggle fr/en                                     | usage i18n                        |
| `web_vitals`                 | `metric_name` (LCP/CLS/INP/FCP/TTFB), `metric_value`, `metric_rating`, `page_path` | lib `web-vitals`                                 | SEO perf par page                 |
| `page_not_found`             | `page_path` (sanitizé)                                                             | render `not-found.tsx`                           | liens cassés / vieilles URL       |

---

## 3. Catalogue d'events — App

Routes : `/login`(+`/check-email`,`/verify`,`/verify/expired`,`/invite`), `/onboarding/step-1..3`, `/onboarding/tour`, `/dashboard`, `/portfolio`, `/contributions`, `/profil`, `/admin/*`, `/verifier/[ref]`, `/acces-suspendu`.

### 3.1 Auth & onboarding

| Event                         | Paramètres                          | Déclencheur                      | Objectif              |
| ----------------------------- | ----------------------------------- | -------------------------------- | --------------------- |
| `login_started`               | `method: "magic_link"`              | submit `/login`                  | début flow            |
| `magic_link_requested`        | —                                   | arrivée `/login/check-email`     | email envoyé          |
| `magic_link_opened`           | —                                   | arrivée `/login/verify`          | lien cliqué           |
| `magic_link_expired`          | —                                   | arrivée `/login/verify/expired`  | friction délai        |
| `magic_link_retry`            | `attempt_count`                     | 2ᵉ+ demande même session         | friction auth         |
| **`login_completed`** 🎯      | `is_first_login` (bool)             | session établie post-verify      | conversion auth       |
| `invite_opened`               | —                                   | arrivée `/login/invite`          | activation invitation |
| `invite_accepted`             | `club_role` (`member`\|`treasurer`) | flow invite complété             | activation            |
| `onboarding_step_viewed`      | `step` (`1`\|`2`\|`3`\|`tour`)      | render écran onboarding          | entonnoir             |
| `onboarding_step_completed`   | `step`, `step_skipped` (bool)       | passage à l'étape suivante       | progression           |
| `onboarding_abandoned`        | `last_step`                         | expiration session sur une étape | drop-off              |
| **`onboarding_completed`** 🎯 | —                                   | fin tour → `/dashboard`          | activation compte     |

### 3.2 Cœur produit

| Event                         | Paramètres                                                                                     | Déclencheur                      | Objectif                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------- |
| `dashboard_viewed`            | `portfolio_value_bucket`, `contribution_status`                                                | render `/dashboard`              | engagement cœur               |
| **`portfolio_viewed`** 🎯     | `portfolio_value_bucket`, `positions_count_bucket`                                             | render `/portfolio`              | **moment « aha »** (1ʳᵉ fois) |
| `portfolio_filter_changed`    | `filter_dimension` (`secteur`), `filter_value`                                                 | filtre/donut                     | usage analyse                 |
| `position_detail_opened`      | `sector`                                                                                       | ouverture détail ligne           | profondeur                    |
| `live_value_failed`           | `provider`, `fallback_used` (bool), `symbols_count_bucket`                                     | échec `PriceProvider` → snapshot | frustration valo              |
| `contribution_viewed`         | `contribution_status` (`ok`\|`late`\|`pending`\|`exempt`), `has_late` (bool)                   | render `/contributions`          | suivi cotisations             |
| `contribution_month_expanded` | —                                                                                              | dépli frise/historique           | profondeur                    |
| **`attestation_download`** 🎯 | `document_type: "detention"`, `trigger_source` (`in_app`\|`email`), `is_first_download` (bool) | clic téléchargement              | usage livrable                |
| `theme_toggled`               | `from_theme`, `to_theme`                                                                       | clic `ThemeToggle`               | préférence UI                 |
| `lang_switch`                 | `from_locale`, `to_locale`                                                                     | toggle next-intl                 | usage i18n                    |

### 3.3 Admin (trésorier)

| Event                    | Paramètres                                                                          | Déclencheur                | Objectif                    |
| ------------------------ | ----------------------------------------------------------------------------------- | -------------------------- | --------------------------- |
| `admin_view`             | `admin_section` (`members`\|`invitations`\|`cotisations`\|`newsletter`\|`settings`) | render `/admin/*`          | usage outil trésorier       |
| `invite_created`         | `club_role`                                                                         | création invitation        | activité admin              |
| `invite_link_copied`     | —                                                                                   | copie du lien d'invitation | activité                    |
| `sync_triggered`         | `trigger_source` (`manual`\|`auto`)                                                 | clic sync                  | usage / confiance fraîcheur |
| `sync_succeeded`         | `sheets_count_bucket`                                                               | retour OK Edge Function    | santé pipeline              |
| `sync_failed`            | `error_stage` (`auth`\|`fetch`\|`map`\|`write`)                                     | échec sync                 | fiabilité                   |
| `csv_export`             | `admin_section`                                                                     | export CSV (V1)            | usage                       |
| `admin_newsletter_sent`  | `recipients_count_bucket`, `is_test` (bool)                                         | envoi `/admin/newsletter`  | activité éditoriale         |
| `member_access_toggled`  | `new_state` (`active`\|`suspended`)                                                 | bascule accès membre       | gestion accès               |
| `admin_settings_updated` | `setting_key`                                                                       | save `/admin/settings`     | audit léger                 |

### 3.4 Transverse / système

| Event                      | Paramètres                                                                         | Déclencheur                       | Objectif                                    |
| -------------------------- | ---------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------- |
| `access_suspended_viewed`  | `reason` (`club_locked`\|`membership`)                                             | render `/acces-suspendu`          | détection blocages                          |
| `attestation_verified`     | `verification_result` (`valid`\|`invalid`\|`not_found`)                            | render `/verifier/[ref]` (public) | usage vérification (ref **jamais** envoyée) |
| `pwa_install_prompt_shown` | `prompt_variant` (`bottom_sheet`\|`ios_instructions`)                              | affichage bannière PWA            | feature PWA                                 |
| `pwa_install_accepted`     | —                                                                                  | `appinstalled` / acceptation      | adoption PWA                                |
| `pwa_install_dismissed`    | `dismiss_reason` (`close`\|`later`)                                                | refus bannière                    | friction                                    |
| `consent_updated`          | `analytics` (`granted`\|`denied`), `choice` (`accept_all`\|`reject_all`\|`custom`) | choix bandeau                     | taux de consentement (gouvernance)          |

### 3.5 Proxies de friction UX (échantillonnés + plafonnés par session)

| Event                | Paramètres                                                        | Déclencheur                        | Révèle                |
| -------------------- | ----------------------------------------------------------------- | ---------------------------------- | --------------------- |
| `rapid_repeat_click` | `element_role`, `click_count`, `route`                            | ≥ 3 clics même cible < 1 s         | rage-click            |
| `dead_click`         | `element_text_hash`, `route`                                      | clic sur non-interactif sans effet | faux affordance       |
| `error_encountered`  | `component`, `error_kind` (`empty`\|`error`\|`fallback`), `route` | montage état error/empty           | échec silencieux vécu |
| `nav_loop`           | `route`, `loop_count`                                             | retour ≥ 2× même route < 30 s      | désorientation        |

> Listeners **globaux** (1 dans le layout authentifié app, 1 vitrine) — **pas d'instrumentation par composant**. Échantillonnage : 100 % app, ~25 % vitrine ; plafond par session.

### 3.6 Recherche UX in-app (P4)

| Event                                                   | Paramètres                   | Déclencheur                                                |
| ------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------- |
| `survey_shown` / `survey_answered` / `survey_dismissed` | `survey_id`, `answer_bucket` | composant `<MicroSurvey>`                                  |
| `feedback_submitted`                                    | `route`, `feedback_type`     | widget feedback (verbatim stocké côté Supabase, pas en GA) |

### 3.7 Features à venir (réserver les noms maintenant)

`announcement_read`, `vote_cast` (`vote_choice` agrégé, jamais nominatif), `directory_member_viewed` (epics sociaux E-NTW), `attestation_email_sent`/`_opened`/`_clicked` (NTF-005, via pont Brevo→GA4 Measurement Protocol — P4), `notification_shown`/`notification_dismissed` (`notif_type`, E-NTF).

---

## 4. User properties & dimensions

### 4.1 User properties (app uniquement, pseudonymes)

Posées via `gtag('set', 'user_properties', {...})` après login, sur le flux app. `user_id` = **UUID Supabase haché**.

| Property                 | Valeurs                              | Source                            |
| ------------------------ | ------------------------------------ | --------------------------------- |
| `user_type`              | `member`\|`treasurer`\|`admin`       | rôle dérivé membership            |
| `club_count`             | 1\|2\|3+                             | nb memberships                    |
| `member_status`          | `active`\|`suspended`\|`inactive`    | enum membership                   |
| `onboarding_complete`    | bool                                 | flag profil                       |
| `member_since_bucket`    | `<6m`\|`6-12m`\|`1-2y`\|`>2y`        | ancienneté bucketisée             |
| `portfolio_value_bucket` | `<10k`\|`10-50k`\|`50-100k`\|`>100k` | **valo grossière, jamais exacte** |
| `has_late_contribution`  | bool                                 | statut cotisation                 |
| `signup_cohort`          | `YYYY-MM`                            | mois d'inscription                |
| `reduced_motion`         | bool                                 | `prefers-reduced-motion` au boot  |
| `locale`, `theme`        | `fr`/`en`, `light`/`dark`            | cookie / localStorage             |

### 4.2 Custom dimensions à enregistrer dans GA4

Quotas propriété standard : **50 event-scope + 25 user-scope + 50 metrics**. Le Data Analyst priorise sous quota.

- **User-scope :** toutes les user properties §4.1 (`club_id_hash` inclus — identifiant club **haché**, jamais le nom).
- **Event-scope :** `app_surface`, `article_slug`, `article_category`, `read_percent`, `cta_id`, `cta_target`, `cta_location`, `club_id`, `category_id`, `form_location`, `form_id`, `error_type`, `error_stage`, `error_kind`, `step`, `last_step`, `contribution_status`, `filter_dimension`, `filter_value`, `trigger_source`, `admin_section`, `club_role`, `verification_result`, `prompt_variant`, `dismiss_reason`, `metric_name`, `metric_rating`, `survey_id`, `answer_bucket`, `choice`, `component`, `route`, `element_role`.
- **Custom metric :** `web_vital_value` (ms/score). **Interdit :** toute metric monétaire (`portfolio_value`, etc.).

---

## 5. Checklist anti-fuite PII (bloquante avant merge)

- [ ] Aucun **email / nom / prénom / téléphone / IBAN / ref d'attestation / nom de club** en paramètre, `page_location`, `page_title` ou `user_id`.
- [ ] Aucun **montant exact** (valo, cotisation, quote-part) — uniquement `*_bucket`. Le paramètre GA réservé `value` **n'est pas** alimenté avec un euro réel.
- [ ] `user_id` = **UUID Supabase haché** ; **jamais** posé sans consentement.
- [ ] Pas de **message d'erreur brut** ni de **contenu de champ** → catégories (`error_type`/`error_stage`) ; `search_term` sanitizé ; libellés sensibles en `*_hash`.
- [ ] `/verifier/[ref]` et `/acces-suspendu` : **redaction** de `page_location` (strip de la `ref`/identifiants) avant envoi.
- [ ] **Google Signals OFF** ; signaux `ad_*` **denied**.
- [ ] GA **ne charge pas** en env `test`/`ci` (pas de pollution e2e) — garde « rend `null` sans Measurement ID » (pattern déjà en place dans `components/Analytics.tsx`).
- [ ] **Redaction of data** GA4 (email/query) activée en filet de sécurité — jamais comme seule protection.
- [ ] Enhanced measurement `form_*` **désactivé** (sinon capture potentielle de PII de champ).

---

## 6. Template d'instrumentation (à coller dans chaque ticket — DoD)

```markdown
## 📊 Instrumentation (DoD)

**Objectif de mesure** : <quelle question produit cette feature aide-t-elle à trancher ?>

**Events GA4** (snake_case, buckets — JAMAIS de montant/PII) :
| Event | Déclencheur | Params (bucketisés) | Flux |
|-------|-------------|---------------------|------|
| `<event_name>` | <action> | `app_surface`, `<bucket_xxx>` | app / vitrine |

**Funnel** (si multi-étapes) : `<entrée>` → `<intermédiaire>` → `<succès>` — étape critique surveillée : <…>

**Critère de succès** (chiffré, relié à un OKR) : <ex. funnel ≥ 80 %>

**Contre-métrique** : <ex. désabonnement, accès suspendu>

**Consentement** : soumis à Consent Mode v2 ? (oui par défaut) — si refus : <pas d'émission / agrégé modélisé>

**Vérif runtime DoD** : event visible en GA4 DebugView ✔ · params bucketisés conformes ✔ · zéro PII ✔
```
