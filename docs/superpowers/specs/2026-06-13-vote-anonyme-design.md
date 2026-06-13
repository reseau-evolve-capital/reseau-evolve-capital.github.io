# Vote Anonyme — Spec Design

**Date** : 2026-06-13  
**Statut** : Approuvé — prêt pour implémentation  
**Scope** : V0 uniquement — votes scopés club (V1 réseau documenté en roadmap)

---

## Contexte et objectif

Les membres d'un club d'investissement ne s'expriment pas librement par peur de heurter. L'objectif est de créer un canal de consultation anonyme **by design** : les membres votent sans que leur identité soit jamais associée à leur réponse, y compris pour les administrateurs.

Le président ou le trésorier crée un vote depuis l'espace admin. Les membres sont notifiés via une bannière non-bloquante sur le dashboard. Ils votent depuis cette bannière ou depuis une page `/votes`. Une fois le vote clôturé, les résultats agrégés sont visibles de tous les membres du club.

**Non inclus dans ce spec** : votes scopés réseau (V1), NPS/satisfaction (feature séparée), commentaires sur les votes.

---

## 1. Types de questions

Un vote = une question, 4 formats possibles :

| Type           | Clé               | Description                                                                                                        |
| -------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| Oui / Non      | `yes_no`          | 3 options fixes : Oui, Non, Abstention                                                                             |
| Choix unique   | `single_choice`   | Options personnalisées, 1 seule réponse (radio)                                                                    |
| Choix multiple | `multiple_choice` | Options personnalisées, N réponses possibles (checkbox)                                                            |
| Texte libre    | `short_text`      | Champ texte court (max 280 chars). Mention explicite : "votre réponse sera visible de l'équipe sous forme anonyme" |

---

## 2. Visibilité des résultats

Configurable par le créateur au moment de la création. Défaut : **après clôture**.

| Mode          | Clé           | Comportement                                                                                                        |
| ------------- | ------------- | ------------------------------------------------------------------------------------------------------------------- |
| Après clôture | `after_close` | Résultats accessibles uniquement quand `status = 'closed'`. Post-vote : écran "résultats disponibles à la clôture". |
| Temps réel    | `live`        | Résultats visibles dès qu'on a voté. Post-vote : affichage immédiat des barres de progression.                      |

---

## 3. Portée (scope)

**V0 — Club uniquement**  
Tout vote est attaché à un `club_id`. Seuls les membres actifs du club y accèdent et y répondent.

**V1 — Réseau (non implémenté, modèle prêt)**  
Le champ `network_wide boolean` est présent dans la table dès la V0. Quand `true`, le vote est visible de tous les clubs. Créé uniquement par `network_admin`. Non activé en V0.

---

## 4. Cycle de vie d'un vote

```
draft → open → closed
```

- **draft** : créé mais non publié. Éditable. Invisible des membres.
- **open** : publié. Membres notifiés. Réponses acceptées.
- **closed** : fermé. Résultats accessibles selon le mode de visibilité.

### Clôture

- **Automatique** : `closes_at` (timestamptz nullable). Défaut suggéré à J+7. Un job `pg_cron` (déjà présent dans le projet) tourne toutes les heures : `UPDATE polls SET status = 'closed', closed_manually_at = now() WHERE status = 'open' AND closes_at < now()`. Le `status` en DB est toujours la source de vérité — pas de check à la lecture.
- **Manuelle** : le président peut clôturer à tout moment depuis `/admin/votes`, même avant `closes_at`.

### Vote définitif

Un membre ne peut pas modifier sa réponse après soumission. La contrainte `UNIQUE (poll_id, user_id)` sur `poll_responses` l'interdit côté DB. L'UI l'annonce clairement avant confirmation : _"Votre réponse est définitive et ne pourra pas être modifiée."_

---

## 5. Découverte et navigation

### Bannière dashboard (découverte principale)

Quand un vote est `open` et que le membre n'a pas encore voté, une bannière dorée non-bloquante apparaît en haut du dashboard (au-dessus des KPI cards), sur le même pattern que `SyncBanner`.

- Affiche : titre du vote, type, deadline, CTA "Voter →"
- Disparaît automatiquement une fois que le membre a voté (`has_voted()` retourne `true`)
- Si plusieurs votes ouverts : max **2 bannières** affichées. Au-delà, une seule bannière "X votes en attente de votre réponse → Voir tous" qui renvoie vers `/votes`
- **GA4** : event `poll_banner_click` (+ `poll_id`, `poll_type`)

### Page `/votes` (historique et accès secondaire)

Accessible depuis le **menu avatar** (dropdown `AppTopbar`), pas dans la BottomNav principale — pour ne pas surcharger la nav.

- Onglets : En cours / Clôturés
- Chaque ligne : titre, type, statut, badge "✓ Voté" si déjà répondu, lien "Résultats →" pour les clôturés
- **GA4** : event `poll_page_view` — sert à mesurer si la page est consultée et si un repositionnement nav est justifié

### Entrée menu avatar

Nouvelle entrée "Votes" dans le dropdown `AppTopbar`, entre "Profil" et "Déconnexion". Visible uniquement si au moins un vote `open` ou `closed` existe pour le club.

---

## 6. Anonymat — garantie technique

L'anonymat est garanti **by design** au niveau de la base de données, pas seulement à l'UI.

### Principe

`user_id` est stocké dans `poll_responses` pour deux raisons légitimes :

1. Garantir **1 seul vote par membre** (contrainte `UNIQUE`)
2. Permettre au membre de savoir s'il a déjà voté (`has_voted()`)

Mais `user_id` n'est **jamais exposé** via les policies RLS à un utilisateur `authenticated`.

### RLS sur `poll_responses`

```sql
-- SELECT : aucune policy pour authenticated
-- Seule la RPC SECURITY DEFINER peut lire les réponses

-- INSERT : tout membre actif du club peut insérer SA réponse
CREATE POLICY "membre peut voter" ON poll_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM polls p
      JOIN memberships m ON m.club_id = p.club_id
      WHERE p.id = poll_id
        AND m.user_id = auth.uid()
        AND m.is_active = TRUE
        AND p.status = 'open'
    )
  );
```

### RPC SECURITY DEFINER

Trois fonctions, toutes en `SECURITY DEFINER STABLE` ou `VOLATILE` selon besoin :

```sql
-- Soumettre un vote (VOLATILE)
submit_vote(p_poll_id uuid, p_selected_options text[], p_text_response text)
  → vérifie : poll ouvert + membre actif du club + pas déjà voté
  → INSERT poll_responses

-- Obtenir les résultats agrégés (STABLE)
get_poll_results(p_poll_id uuid)
  → vérifie : membre du club + résultats visibles (after_close → status=closed, live → toujours)
  → retourne : { option text, count int, pct numeric }[]
  → JAMAIS user_id dans le retour

-- Vérifier si le membre a voté (STABLE)
has_voted(p_poll_id uuid)
  → retourne boolean
  → le membre peut savoir s'il a voté, sans voir sa propre réponse
```

---

## 7. Schéma Supabase

### Table `polls`

```sql
CREATE TABLE polls (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz DEFAULT now(),

  -- Scope
  club_id         uuid REFERENCES clubs(id) NOT NULL,
  network_wide    boolean DEFAULT false,           -- V1, non utilisé en V0

  -- Contenu
  title           text NOT NULL,
  description     text,
  question_type   text NOT NULL
                  CHECK (question_type IN ('yes_no','single_choice','multiple_choice','short_text')),
  options         jsonb,                           -- null pour yes_no et short_text
                                                   -- [{ id, label }] pour single/multiple

  -- Paramètres
  results_visibility text NOT NULL DEFAULT 'after_close'
                     CHECK (results_visibility IN ('after_close','live')),
  closes_at       timestamptz,                     -- null = pas de deadline automatique
  notify_by_email boolean DEFAULT false,

  -- Cycle de vie
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','open','closed')),
  closed_manually_at timestamptz,

  -- Auteur
  created_by      uuid REFERENCES auth.users NOT NULL
);
```

### Table `poll_responses`

```sql
CREATE TABLE poll_responses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz DEFAULT now(),

  poll_id         uuid REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  user_id         uuid REFERENCES auth.users NOT NULL,

  -- Réponse (selon question_type)
  selected_options text[],                         -- yes_no / single / multiple
  text_response   text,                            -- short_text (max 280 chars)

  UNIQUE (poll_id, user_id)                        -- 1 vote par membre
);
```

### RLS `polls`

```sql
-- Membres : lecture des votes ouverts/clôturés de leur club
CREATE POLICY "membre lit les votes de son club" ON polls
  FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT club_id FROM memberships WHERE user_id = auth.uid() AND is_active = TRUE)
    AND status IN ('open', 'closed')
  );

-- Staff : lecture + écriture (draft inclus)
CREATE POLICY "staff gère les votes" ON polls
  FOR ALL TO authenticated
  USING (get_user_role_in_club(club_id) IN ('treasurer','president','network_admin'))
  WITH CHECK (get_user_role_in_club(club_id) IN ('treasurer','president','network_admin'));
```

---

## 8. Architecture applicative

### Nouvelles routes (`apps/web`)

```
/votes                          → PollsView (liste membre)
/votes/[id]                     → PollDetailView (voter ou voir résultats)
/admin/votes                    → AdminPollsView (liste admin)
/admin/votes/nouveau            → AdminPollCreateView
/admin/votes/[id]               → AdminPollDetailView (résultats + clôture)
```

### Nouveaux composants (`packages/ui`)

| Composant         | Couche   | Rôle                                                  |
| ----------------- | -------- | ----------------------------------------------------- |
| `PollBanner`      | molecule | Bannière dashboard (dorée, CTA "Voter →")             |
| `PollCard`        | molecule | Ligne dans la liste `/votes`                          |
| `PollVoteSheet`   | organism | Modal/sheet de vote (4 types de réponse)              |
| `PollResultsView` | organism | Résultats agrégés avec barres de progression          |
| `PollCreateForm`  | organism | Formulaire admin de création (multi-steps selon type) |

### Intégration dashboard

`PollBanner` s'insère dans le layout `/dashboard` au-dessus des KPI cards. Il appelle `has_voted(pollId)` en RSC pour chaque vote ouvert du club. Si `has_voted = false` → bannière visible.

### Intégration `AppTopbar`

Nouvelle entrée dans le dropdown avatar :

```tsx
// Dans AppTopbar / AppChromeTopbar
{ label: t('nav.topbar.votes'), href: '/votes', icon: 'Vote' }
// Conditionnel : affiché si hasPollActivity (RSC, 1 seul check)
```

---

## 9. GA4 events

| Event                 | Déclencheur                           | Propriétés                              |
| --------------------- | ------------------------------------- | --------------------------------------- |
| `poll_banner_view`    | Bannière rendue sur le dashboard      | `poll_id`, `poll_type`                  |
| `poll_banner_click`   | Clic sur "Voter →" depuis la bannière | `poll_id`, `poll_type`                  |
| `poll_vote_submitted` | Submit réussi                         | `poll_id`, `poll_type`, `question_type` |
| `poll_results_viewed` | Ouverture des résultats               | `poll_id`, `poll_type`                  |
| `poll_page_view`      | Visite de `/votes`                    | —                                       |

Le taux de `poll_page_view` vs `poll_banner_click` révèle si les membres utilisent la page en navigation directe ou seulement via la bannière — donnée décisionnelle pour un éventuel repositionnement dans la nav.

---

## 10. Texte libre — cas particulier

Pour `question_type = 'short_text'` :

- Mention obligatoire dans le modal avant le champ : _"Votre réponse sera visible de l'équipe sous forme anonyme. Votre nom n'y sera pas associé."_
- Limite : 280 caractères (enforced UI + contrainte DB `CHECK (char_length(text_response) <= 280)`)
- Dans les résultats : liste des réponses texte, sans attribution, avec mention "X réponses reçues"
- Un admin voit les textes mais ne peut pas les relier à un membre (RPC `get_poll_results` ne retourne pas `user_id`)

---

## 11. Tests attendus

| Couche                            | Ce qu'on teste                                                                                                                                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Storybook play** (`@evolve/ui`) | PollBanner : clic CTA, état "déjà voté". PollVoteSheet : 4 types, sélection, submit disabled sans sélection, état succès. PollResultsView : barres de progression, 100% total.                                       |
| **Vitest**                        | RPC `submit_vote` : double-vote bloqué (UNIQUE), poll fermé rejeté, membre hors-club rejeté. `has_voted` : retourne false avant, true après. `get_poll_results` : agrégats corrects, jamais user_id dans la réponse. |
| **jest-axe**                      | PollVoteSheet : focus visible, rôles ARIA (radio group, checkbox group), cibles ≥ 44px.                                                                                                                              |
| **E2E Playwright**                | Flow complet : bannière visible → voter → bannière disparaît → résultats après clôture manuelle. Admin : créer vote → publier → vérifier bannière membre.                                                            |

---

## 12. Roadmap

### V0 (ce spec — ~7–8 jours)

- Table `polls` + `poll_responses` + RLS + 3 RPC
- Composants `@evolve/ui` : PollBanner, PollCard, PollVoteSheet, PollResultsView, PollCreateForm
- Routes `/votes`, `/votes/[id]`, `/admin/votes/**`
- Bannière dashboard + entrée menu avatar
- 4 types de question
- Visibilité configurable (after_close / live)
- Clôture auto (cron) + manuelle
- GA4 events

### V1 (après ~20 votes créés — ~4–5 jours)

- Scope réseau (`network_wide = true`) — créé par `network_admin`, agrégats cross-club
- Notification email Brevo à l'ouverture d'un vote (toggle déjà présent en V0)
- Résultats par club pour les votes réseau
- Export CSV des résultats (admin)

### V2 (futur)

- Votes programmés (date d'ouverture future)
- Questionnaires multi-questions (plusieurs questions dans un même vote)
- Rappel automatique aux membres n'ayant pas voté (J-2 avant clôture)
