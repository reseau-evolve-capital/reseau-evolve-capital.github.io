# ADM-007 — Plan d'implémentation figé (contrôle d'accès membre)

> Cadrage P0. Spec adaptée à la VRAIE base (≠ notes indicatives du ticket). Source de vérité
> pour les sous-agents. Réfs visuelles : `docs/audits/shots/ref-adm007-standalone-{light,dark}.jpeg`
> (4 écrans, depuis `REC/standalone-exports/Admin - Accès & Invitations-standalone.html`).

## Décisions owner (§5 — confirmées via AskUserQuestion, 2026-06-04)

1. **Autorité** = **trésorier+** (`treasurer|president|network_admin`). Cohérent avec l'espace
   `/admin` gardé `user_is_staff()`. Écritures via RPC `SECURITY DEFINER` staff-scopées (jamais
   un élargissement de la policy RLS `president manage`, jamais service-role côté trésorier).
2. **Email V0** = **lien copiable dans l'UI** + auto-send **déféré à E-NTF**. Interface
   `InvitationMailer` (façon `PriceProvider`) ; impl par défaut = no-op (le lien clair est renvoyé
   par la Server Action et affiché avec un bouton « Copier »). Note UI « envoi auto avec E-NTF ».
3. **Invité** = visible **uniquement dans `/admin/invitations`** (funnel). Le `membership` n'existe
   qu'à l'acceptation. → La colonne **Accès** de `/admin/members` n'émet que **Actif/Bloqué**
   (déviation assumée vs standalone qui montre un badge « Invité » ; `AccessBadge` supporte quand
   même `invited` pour fidélité au design, mais apps/web ne l'émet pas sur les memberships).
4. **Verrou** = **par-club sur `memberships`**. Bloqué globalement ⇔ TOUTES les adhésions actives
   sont `locked` (helper `current_user_access_blocked()`).

## Data model figé — migration `016_member_access_and_invitations.sql`

**Enums** (idempotents, pattern `001`) :

- `member_access_status` = `('active','locked')`
- `invitation_status` = `('pending','accepted','expired','revoked')`
- `access_event_action` = `('locked','unlocked')` — le funnel invitation est tracé par la table
  `invitations` elle-même (invited_at/accepted_at/revoked_at), pas par les events (qui sont
  membership-scoped et n'existent qu'après acceptation).

**`memberships`** (ALTER, additif) :

- `access_status member_access_status NOT NULL DEFAULT 'active'`
- `locked_at timestamptz`, `locked_reason text`, `locked_by uuid REFERENCES users(id)`

**`invitations`** (nouvelle) :
`id`, `club_id FK clubs ON DELETE CASCADE`, `email text`, `token_hash text UNIQUE`,
`status invitation_status DEFAULT 'pending'`, `invited_by uuid FK users ON DELETE SET NULL`,
`invited_at`, `expires_at DEFAULT now()+'72h'`, `accepted_at`, `revoked_at`, `created_at`, `updated_at`.
Index : `UNIQUE (club_id, lower(email)) WHERE status='pending'` (1 seule invite vivante/email/club)

- `(club_id)` + `(lower(email))`.

**`member_access_events`** (nouvelle) :
`id`, `membership_id FK memberships ON DELETE CASCADE`, `action access_event_action`,
`reason text`, `actor_id uuid FK users ON DELETE SET NULL`, `created_at`. Index `(membership_id)`.

**RLS** (least privilege — mutations via RPC definer uniquement) :

- `invitations` : RLS ON ; `SELECT` réservé staff du club (`get_user_role_in_club(club_id) ∈ staff`).
  Aucune policy INSERT/UPDATE/DELETE (passe par RPC).
- `member_access_events` : RLS ON ; `SELECT` staff (via join membership→club). Pas d'écriture directe.

**RPC `SECURITY DEFINER` (vérifient `get_user_role_in_club ∈ staff` AVANT d'écrire)** :

- `admin_set_member_access(p_membership_id uuid, p_locked boolean, p_reason text)` → maj
  `access_status`/`locked_*` + insert event (`locked`/`unlocked`, actor=`auth.uid()`).
- `admin_create_invitation(p_club_id uuid, p_email text, p_token_hash text)` → garantit la ligne
  `public.users` (allowlist ; `full_name` placeholder = email, NOT NULL) + insère l'invitation
  pending. Renvoie l'`id`.
- `admin_revoke_invitation(p_invitation_id uuid)` → `status='revoked'`, `revoked_at=now()`.
- `admin_resend_invitation(p_invitation_id uuid, p_token_hash text)` → remplace `token_hash`
  (invalide l'ancien), `expires_at=now()+72h`, `invited_at=now()`, `status='pending'`.
- `accept_invitation(p_token_hash text)` → si pending & non expiré : `status='accepted'`,
  `accepted_at=now()`, renvoie l'email ; sinon `expired`/null. Grant `service_role` (route server-only).
- `current_user_access_blocked()` (STABLE) → bool : `EXISTS(active+locked)` ET
  `NOT EXISTS(active+access='active')`. Grant `authenticated` (middleware).

Grants : `REVOKE … FROM public`, `GRANT EXECUTE … TO authenticated` (sauf `accept_invitation` →
`service_role`). `expire_stale_invitations()` optionnel (marque `expired` au-delà d'`expires_at`) —
sinon calcul à la lecture. V0 : calcul à la lecture (badge) + check `expires_at` dans `accept_invitation`.

## Token d'invitation (NOTRE token, server-only)

Server Action génère un token aléatoire (`crypto.randomBytes(32)` base64url) → `sha256` = `token_hash`
stocké en base → le **clair** part dans le lien `/login/invite?token=<clair>` (jamais stocké).
`accept` recalcule le hash et matche. Le clair n'est renvoyé qu'à la création/renvoi (affiché 1×
avec « Copier »). Route publique `GET /login/invite` (sous `(auth)`, hors préfixes protégés) :
hash → `accept_invitation` (service-role) → email → `supabase.auth.admin.generateLink({type:'magiclink'})`
→ redirect `/login/verify?token_hash=…&type=email&invited=1` (réutilise le flux verify existant →
session → onboarding). L'onboarding affiche un accueil « Vous avez été invité » si `?invited=1`.

## Middleware (`apps/web/middleware.ts`)

Après `getUser()` : sur préfixe protégé (hors `/acces-suspendu`), si `rpc('current_user_access_blocked')`
→ redirect `/acces-suspendu`. Route `/acces-suspendu` : si non authentifié → `/login` ; si non bloqué
→ `/dashboard` ; sinon rend l'écran (dark, hors `(app)` chrome). `mailto` trésorier résolu côté serveur
(RLS du user : adhésions actives → role∈{treasurer,president} → users.email).

## Contrats de props `@evolve/ui` (présentationnels, copy en props défaut FR, 0 hex, jest-axe)

- **`AccessBadge`** (atom) : `status: 'active'|'locked'|'invited'` ; `labels?: {active,locked,invited}` ;
  rend dot/icône cadenas + texte (role `status`, aria-label). Tokens : vert=`data.positive`,
  rouge=`data.negative` (#C53030, JAMAIS brand.red), orange=`data.warning`.
- **`InvitationStatusBadge`** (atom, ou variante de `Badge`/`Pill`) : `status: invitation_status` →
  En attente(orange)/Acceptée(vert)/Expirée(gris)/Révoquée(rouge). Email barré si revoked/expired.
- **`InvitationsTable`** (organism, modèle `MembersList`/`PortfolioTable` headless) :
  `invitations: InvitationRow[]`, `isLoading?`, `labels?`, callbacks `onResend(id)`, `onRevoke(id)`.
  `InvitationRow = { id, email, invitedAt, expiresAt, status }`. Dates formatées par le consommateur
  (apps/web via `@evolve/utils`) → la row reçoit des `string` déjà formatées OU des ISO + le composant
  reçoit un `formatDate` en prop. **Choix** : row reçoit ISO, table reçoit `formatDate?: (iso)=>string`
  défaut `fr-FR` léger. Actions désactivées selon statut (accepted→tout off ; expired→resend on,
  revoke off ; revoked→tout off). EmptyState (icône enveloppe) + skeleton.
- **`InviteForm`** (molecule) : champ email + bouton « Envoyer l'invitation » + note 72h ;
  `onSubmit(email)`, `isPending`, `error?`, `labels?`. Inline (pas de modal).
- **`LockMemberModal`** (organism, Radix Dialog comme `PositionDetailModal`) : `open`, `onOpenChange`,
  `memberName`, `onConfirm({reason})`, `isPending`, `labels?`. Select raison (Impayé/Départ/Suspendu
  temporairement/Autre) + champ libre si Autre. Ghost Annuler + destructif « Bloquer l'accès ».
  Focus-trap + Escape (Radix). Réutilisable pour déblocage (variante `mode: 'lock'|'unlock'`).
- **`MemberActionsMenu`** (molecule, Radix DropdownMenu — déjà en dep, non wrappé) : `accessStatus`,
  callbacks `onLock/onUnlock/onInvite/onViewProfile`, `labels?`. Items contextuels selon l'accès.
- **`SuspendedScreen`** (organism/template) : `treasurerMailto?`, `onSignOut?` (ou liens en props),
  `labels?`, `logo`. Toujours dark (le composant force son propre fond sombre via tokens). Cadenas
  ouvert + halo. Desktop + mobile (responsive). C'est un écran public → AAA sur le titre.
- **`MembersList`** : +colonne **Accès** (après Statut) rendant `AccessBadge` + slot actions
  (`MemberActionsMenu`). `MemberRow` gagne `accessStatus: 'active'|'locked'`. Nouveaux `labels`
  (`columns.access`, `access.*`, `actions.*`). Row `locked` légèrement teintée (token, pas de hex).

## i18n — nouveaux namespaces (`apps/web/messages/{fr,en}.json`, parité stricte)

- `admin.invitations` : `title`, `subtitle`, `inviteCta`, `form.{placeholder,submit,note,success,
errorInvalid,errorDuplicate}`, `columns.{email,sentAt,expiresAt,status,actions}`,
  `status.{pending,accepted,expired,revoked}`, `actions.{resend,revoke,copyLink,linkCopied}`,
  `empty.{title,description}`, `confirmRevoke`.
- `admin.members.access` : `column`, `active`, `locked`, `invited`, `actions.{lock,unlock,invite,
viewProfile}`, `lockModal.{title,description,reasonLabel,reasonPlaceholder,reasons.*,otherPlaceholder,
cancel,confirm,success}`, `unlockSuccess`.
- `accessSuspended` (écran public, FR+EN) : `title`, `description`, `contactCta`, `signOut`.
- `onboarding.invitedWelcome` (bandeau « Vous avez été invité »).

## API / serveur (pattern existant `lib/data/admin.ts` + routes `/api/admin/*`)

- **Lectures (RLS trésorier, RSC + TanStack Query)** dans `lib/data/admin.ts` :
  `listClubInvitations(supabase, clubId) → Invitation[]` (DTO strict : statut + `isExpired` calculé) ;
  `getMemberAccessLog(supabase, membershipId) → AccessEvent[]` ; `getClubMembers` enrichi de
  `accessStatus`. Helpers purs : `invitationStatusLabel`, `isInvitationActionable`.
- **Mutations = Server Actions** (`app/(app)/admin/.../actions.ts`) appelant les RPC via le client
  serveur (session) : `lockMember`, `unlockMember`, `createInvitation` (génère token+hash, renvoie le
  lien clair), `resendInvitation` (idem), `revokeInvitation`. La génération du lien d'invitation est
  server-only ; `accept_invitation` (service-role) uniquement dans la route `/login/invite`.
- **TanStack Query** : invalidation des clés `['admin','invitations',clubId]` et `['admin', …]`
  (cf. `useSyncStatus` qui invalide déjà `['admin']`).

## Écrans / routes apps/web

- `app/(app)/admin/invitations/page.tsx` (RSC garde par-club) + `InvitationsView.tsx` (client :
  InviteForm + InvitationsTable + copy-link) + onglet nav admin « Invitations ».
- `/admin/members` : colonne Accès + `MemberActionsMenu` + `LockMemberModal` dans `MembersView`.
- `app/acces-suspendu/page.tsx` (hors `(app)`, dark, `SuspendedScreen`) + route sign-out réutilisée.
- `app/(auth)/login/invite/route.ts` (GET, server-only).

## Découpage tickets ADM-007.x (ordre)

- **ADM-007.1 (DB)** : migration 016 + RLS + RPC + helper ; `db push` ; `types.gen.ts` ; seeds
  (`seed-verif.sql` + `admin.spec.ts` : 1 membre `locked` + 1 invitation `pending`).
- **ADM-007.2 (data/serveur)** : `lib/data/admin.ts` (lectures + helpers purs + tests), Server Actions
  (RPC), route `/login/invite`, middleware verrou, `InvitationMailer`.
- **ADM-007.3 (@evolve/ui)** [parallèle] : AccessBadge, InvitationStatusBadge, InviteForm,
  InvitationsTable, MemberActionsMenu, LockMemberModal, SuspendedScreen + colonne Accès MembersList ;
  stories + vitest/jest-axe.
- **ADM-007.4 (apps/web)** : pages + câblage Server Actions + TanStack Query + nav.
- **ADM-007.5 (i18n+tests+visuel)** : externalisation fr/en, e2e (invite/lock/unlock/suspended),
  axe, audit visuel light/dark 375/1440, MAJ `design-reference-map.md`.
- **ADM-007.6 (CI+clôture)** : `act` vert, gate complet, commits FR, mémoire, récap.

## Orchestration

P1 (DB, fondation, sécu-critique) → orchestrateur lui-même. Puis P2 (data/serveur) ∥ P3 (@evolve/ui)
en sous-agents (fichiers disjoints : `apps/web/lib`+`actions`+`middleware` vs `packages/ui/src`).
P4 = intégration (orchestrateur). P5 i18n (l'orchestrateur fusionne le catalogue) + tests + visuel.
P6 CI + commits + mémoire.

## Déviations explicitement assumées (à noter dans design-reference-map)

- Colonne Accès `/admin/members` : **pas de badge « Invité »** (décision §5.3) ; invités → `/admin/invitations`.
- Lien d'invitation : **copiable dans l'UI** (pas d'email auto en V0 — E-NTF).
- Lien clair affiché **une seule fois** (à la création/renvoi) — non re-affichable (token hashé en base).
