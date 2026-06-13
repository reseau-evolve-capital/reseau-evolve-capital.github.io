# Feedback Widget — Spec Design

**Date** : 2026-06-13  
**Statut** : Approuvé — prêt pour implémentation  
**Scope** : V0 uniquement (V1/V2 documentées en roadmap, non planifiées)

---

## Contexte et objectif

Permettre aux membres authentifiés de signaler un bug, soumettre une idée de fonctionnalité ou poser une question, directement depuis l'application web, sans friction. Les feedbacks sont stockés en Supabase (source de vérité), triés par IA, puis dispatchés vers Discord, Notion, GitHub Issues et Brevo selon leur type.

**Non inclus dans ce spec** : feature NPS/satisfaction (feature séparée, déclenchée par événements produit, ticket à créer quand V0 est livré).

---

## 1. Point d'entrée (placement UI)

### Desktop

Icône `MessageCircle` (Lucide) dans l'`AppTopbar`, à droite, entre `localeSwitcher` et `themeToggle`.

### Mobile

- Même icône `MessageCircle` dans l'`AppTopbar`, visible à côté de l'avatar.
- Le `themeToggle` est masqué sur mobile (`hidden md:inline-flex`) et déplacé dans le dropdown avatar — même pattern que `localeSwitcher` aujourd'hui.

### Modifications `AppTopbar` (`packages/ui`)

Deux nouvelles props ajoutées, rien de destructif :

```tsx
onFeedback?: () => void     // ouvre le FeedbackSheet
feedbackLabel?: string      // i18n, défaut "Retour"
```

Câblage dans `AppChrome` (`apps/web/components/chrome/AppChrome.tsx`) :

```tsx
<AppChromeTopbar
  ...
  onFeedback={() => setFeedbackOpen(true)}
  feedbackLabel={t('nav.topbar.feedback')}
/>
<FeedbackSheet
  open={feedbackOpen}
  onOpenChange={setFeedbackOpen}
  currentRoute={pathname}
  onSubmit={handleFeedbackSubmit}
  labels={t('feedback')}
/>
```

---

## 2. Composant `FeedbackSheet` (`packages/ui`)

### API

```tsx
interface FeedbackSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRoute: string // pathname Next.js, capturé automatiquement
  onSubmit: (data: FeedbackSubmission) => Promise<void>
  labels: FeedbackLabels // i18n complet
}

interface FeedbackSubmission {
  type: 'bug' | 'feature' | 'question'
  message: string
  screenshotDataUrl?: string // base64, présent uniquement si l'utilisateur a cliqué "Joindre"
  pageUrl: string // window.location.href
  pageRoute: string // currentRoute prop
  userAgent: string // navigator.userAgent
}
```

### 5 états du composant

| État                   | Condition            | Description                                                                            |
| ---------------------- | -------------------- | -------------------------------------------------------------------------------------- |
| **idle**               | initial              | Sélecteur de type + textarea + bouton "Joindre une capture" discret                    |
| **screenshot-preview** | après clic "Joindre" | Prévisualisation de la capture + mention vie privée + bouton "Retirer"                 |
| **loading**            | après submit         | Formulaire désactivé + spinner                                                         |
| **success**            | après réponse OK     | Confirmation + mention email envoyé                                                    |
| **error**              | après réponse KO     | Message d'erreur + bouton "Réessayer" (re-passe en idle avec les données pré-remplies) |

### Comportement screenshot (opt-in strict)

1. L'utilisateur clique "Joindre une capture d'écran (optionnel)"
2. Le sheet est masqué temporairement (opacity 0, pointeur désactivé) pour que `html2canvas` capture la page derrière, pas le formulaire lui-même
3. `html2canvas` capture l'écran courant
4. Le sheet est réaffiché
5. Une **prévisualisation** s'affiche dans le formulaire
6. La mention **"Cette capture sera partagée uniquement avec l'équipe technique"** est visible
7. L'utilisateur peut cliquer "Retirer" pour supprimer la capture avant envoi
8. Si l'utilisateur ne clique pas le bouton, **aucun screenshot n'est pris**

### Contexte capturé automatiquement (sans action utilisateur)

- `pageUrl` : `window.location.href`
- `pageRoute` : pathname Next.js injecté via prop `currentRoute`
- `userAgent` : `navigator.userAgent`

### Aucune logique métier dans le composant

Le composant remonte les données via `onSubmit`. Toute la logique (upload Storage, insert Supabase) vit dans la Server Action `apps/web`.

---

## 3. Schéma Supabase

### Table `feedback`

```sql
CREATE TABLE feedback (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz DEFAULT now(),

  -- Auteur
  user_id         uuid REFERENCES auth.users NOT NULL,
  user_email      text NOT NULL,

  -- Contenu
  type            text CHECK (type IN ('bug','feature','question')) NOT NULL,
  message         text NOT NULL,
  screenshot_url  text,                    -- null si pas de screenshot

  -- Contexte auto
  page_url        text NOT NULL,
  page_route      text NOT NULL,
  user_agent      text,

  -- IA (rempli par l'Edge Function après INSERT)
  ai_title        text,
  ai_severity     text CHECK (ai_severity IN ('blocking','annoying','minor')),
  ai_summary      text,
  ai_category     text,

  -- Destinations externes
  github_issue_url  text,
  notion_page_id    text,
  discord_notified  boolean DEFAULT false,
  email_sent        boolean DEFAULT false,

  -- Statut (pour V2 tracker in-app)
  status          text DEFAULT 'received'
                  CHECK (status IN ('received','in_progress','done','closed'))
);
```

### RLS

- Membre : `SELECT` uniquement sur ses propres feedbacks (`user_id = auth.uid()`)
- Staff (trésorier) : `SELECT` sur tous les feedbacks
- `INSERT` : tout membre authentifié
- `UPDATE` : service_role uniquement (Edge Function)

### Supabase Storage

Bucket `screenshots` (privé). Les screenshots sont uploadés **avant** l'INSERT en table — si l'upload échoue, le feedback est quand même soumis sans screenshot (`screenshot_url = null`).

---

## 4. Server Action (`apps/web`)

```
POST /api/feedback  (Server Action Next.js)

1. Authentification : vérifie la session Supabase (rejet 401 si absent)
2. Si screenshotDataUrl présent :
   a. Upload dans Supabase Storage bucket `screenshots/`
   b. Récupère l'URL publique signée
3. INSERT dans table `feedback` avec toutes les données + screenshot_url
4. Retourne { success: true }

L'Edge Function est déclenchée par trigger Postgres — la Server Action n'appelle pas l'Edge Function directement.
```

---

## 5. Edge Function `feedback-dispatch`

### Déclenchement

Trigger Postgres sur `INSERT INTO feedback` → appelle l'Edge Function `feedback-dispatch` avec le row complet. La Server Action n'appelle pas l'Edge Function — le découplage garantit qu'un feedback est toujours dispatché même si le client coupe la connexion.

### Séquence interne

```
1. Reçoit le row feedback + screenshot_url

2. Appelle Claude Haiku (claude-haiku-4-5) :
   Input : type, message, page_route, user_agent, screenshot_url
   Prompt selon type :
     bug     → titre structuré (max 80 chars), sévérité (blocking/annoying/minor),
                diagnostic préliminaire (2-3 phrases)
     feature → titre, résumé, catégorie (UX/données/perf/admin/autre)
     question → titre, résumé, intention (technique/métier/facturation/autre)
   Output JSON : { title, severity?, summary, category? }

3. UPDATE feedback SET ai_title, ai_severity, ai_summary, ai_category

4. Fan-out parallèle (Promise.all, chaque branche dans try/catch indépendant) :

   a. Discord webhook (tous types)
      Embed : type pill + titre IA + page_route + lien Supabase admin
      Couleur : rouge=bug, bleu=feature, gris=question

   b. Notion API (tous types)
      DB `feedback` : titre IA, type, sévérité, catégorie, message, lien screenshot, date

   c. GitHub Issues API (type=bug uniquement)
      Titre : ai_title
      Body :
        - Sévérité estimée
        - Page : page_route · user_agent résumé
        - Description utilisateur (verbatim)
        - Diagnostic IA
        - Screenshot (lien URL si présent)
        - Lien Supabase feedback row
      Labels : ["bug", "user-reported", severity]

   d. Brevo email (tous types)
      Template : accusé de réception
      Destinataire : user_email
      Corps : confirmation + type + mention "l'équipe a été notifiée"

5. UPDATE feedback SET
     github_issue_url, notion_page_id,
     discord_notified=true, email_sent=true
```

### Résilience

Si une destination échoue (API down, rate limit), les autres continuent. Le feedback reste intègre en Supabase dans tous les cas. Les champs `discord_notified`, `email_sent` restent `false` si la branche a échoué — permet un retry manuel.

### Variables d'environnement requises

```
ANTHROPIC_API_KEY
DISCORD_FEEDBACK_WEBHOOK_URL
GITHUB_TOKEN
GITHUB_REPO                    # ex. omniventus/reseau-evolve-capital
NOTION_TOKEN
NOTION_FEEDBACK_DB_ID
# BREVO_API_KEY déjà présent (Edge Function send-email)
```

---

## 6. Localisation (i18n)

Clés à ajouter dans `messages/fr.json` et `messages/en.json` :

```json
{
  "nav": {
    "topbar": {
      "feedback": "Retour"
    }
  },
  "feedback": {
    "title": "Votre retour",
    "subtitle": "Aidez-nous à améliorer l'application",
    "types": {
      "bug": "Bug",
      "feature": "Idée",
      "question": "Question"
    },
    "messagePlaceholder": {
      "bug": "Décrivez ce qui s'est passé…",
      "feature": "Décrivez votre idée…",
      "question": "Posez votre question…"
    },
    "screenshot": {
      "attach": "Joindre une capture d'écran (optionnel)",
      "attached": "Capture jointe",
      "remove": "Retirer",
      "privacyNote": "Cette capture sera partagée uniquement avec l'équipe technique."
    },
    "submit": "Envoyer →",
    "sending": "Envoi…",
    "success": {
      "title": "Merci pour votre retour !",
      "subtitle": "Un email de confirmation vous a été envoyé.",
      "pill": "Vérifiez votre boîte mail",
      "close": "Fermer"
    },
    "contextLabel": "Page actuelle"
  }
}
```

---

## 7. Tests attendus

| Couche                            | Ce qu'on teste                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Storybook play** (`@evolve/ui`) | FeedbackSheet : 4 états, sélection de type, screenshot attach/remove, submit disabled pendant loading |
| **Vitest** (`apps/web`)           | Server Action : rejet sans auth, upload Storage, INSERT row                                           |
| **jest-axe**                      | FeedbackSheet : focus visible, rôles ARIA, cibles tactiles ≥ 44px                                     |
| **E2E Playwright**                | Flow complet : ouvrir widget → remplir → envoyer → voir état succès                                   |

---

## 8. Roadmap

### V0 (ce spec — ~5–6 jours)

Tout ce qui est décrit ci-dessus.

### V1 (après ~50 feedbacks reçus — ~4–5 jours)

- Routine IA hebdo : regroupe les features similaires, détecte patterns récurrents → résumé Discord/Notion
- Agent IA qui draft une PR de fix sur les bugs GitHub + notif Discord
- Déduplication : bug déjà ouvert → commentaire sur l'Issue existant
- Emails Brevo quand bug résolu (webhook GitHub → Supabase → Brevo) ou feature planifiée

### V2 (produit mature — ~7–10 jours)

- Page `/feedback` : historique des soumissions + statuts in-app
- Badge sur icône topbar si réponse disponible
- Feature satisfaction/NPS séparée (bottom-sheet déclenchée par événements clés : J+7, J+30, post-cotisation)
