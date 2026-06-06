# Guide d'utilisation — Evolve Capital

Evolve Capital est l'espace membre privé du réseau de clubs d'investissement Evolve Capital.
Chaque membre y suit, pour son club, sa **quote-part**, le **portefeuille** commun et ses
**cotisations**. Les trésoriers (et présidents) disposent en plus d'un **espace de gestion** :
suivi du club, membres, cotisations, invitations et contrôle d'accès.

> **Document vivant.** Ce guide décrit ce qui est disponible aujourd'hui (version V0). Il sera
> complété au fil des versions. Les fonctionnalités prévues mais pas encore actives sont
> regroupées en fin de document, dans « À venir ».

L'accès se fait **sur invitation** : on rejoint l'application uniquement lorsqu'un club nous y
invite, ou lorsque notre email a été ajouté à la liste des membres autorisés.

---

## 1. Se connecter

L'application n'utilise **pas de mot de passe**. La connexion repose sur un **lien magique**
envoyé par email.

1. Ouvrez la page de connexion et saisissez votre **adresse email**.
2. Cliquez sur **« Recevoir mon lien »**. Si votre email est bien autorisé dans un club, un
   message vous invite à **vérifier votre boîte mail**.
3. Ouvrez l'email reçu et cliquez sur le **lien de connexion**. Il est valable quelques minutes
   seulement (la page vous indique la durée exacte). Au-delà, demandez-en simplement un nouveau.
4. Le lien vous connecte et vous amène directement à votre **tableau de bord** — ou, s'il s'agit
   de votre première connexion, au parcours d'**inscription** (onboarding).

Bon à savoir :

- Si l'email **n'est pas encore invité** dans un club, l'application le signale clairement et
  aucun lien n'est envoyé.
- Sur la page « Vérifie ta boîte email », un bouton **Renvoyer** permet de redemander un lien
  (avec un court délai d'attente entre deux envois).
- La connexion par **passkey** est annoncée mais **pas encore disponible** (marquée « V1 »).

---

## 2. Première connexion : l'inscription (onboarding)

Lors de votre toute première connexion, vous complétez votre profil en **3 étapes**, suivies
d'un court **tour de présentation**. Si vous arrivez via une invitation, un encart
**« Vous avez été invité »** vous accueille.

1. **Étape 1 — Identité.** Prénom et nom (obligatoires), téléphone (facultatif).
2. **Étape 2 — Coordonnées.** Photo de profil (facultative), téléphone, adresse.
3. **Étape 3 — Accords.** Acceptation de la charte de confidentialité (RGPD) et choix
   d'apparaître ou non dans l'annuaire des membres, puis **« Rejoindre le club »**.
4. **Tour guidé.** Trois écrans présentent l'essentiel : votre **quote-part**, votre **club** et
   le **réseau**. Vous pouvez **passer le tour** ou cliquer sur **« Accéder à mon espace »**.

---

## 3. Espace membre

La navigation se fait par la **barre latérale** (sur ordinateur) ou la **barre du bas**
(sur mobile, 3 onglets : Tableau, Portefeuille, Cotisations). En haut à droite, une **barre
supérieure** affiche la dernière synchronisation, la date, le **sélecteur de langue**, le
**thème clair/sombre** et le **menu utilisateur** (Profil, Espace trésorier si vous y avez droit,
Déconnexion).

### 3.1 Tableau de bord

Vue d'ensemble de votre situation dans le club :

- **Ta quote-part** : la valeur de votre part du portefeuille du club. Un détail (en cliquant)
  rappelle le pourcentage que représente votre part et renvoie vers le portefeuille.
- **Indicateurs clés** : votre détention (en %), votre total cotisé, votre statut de cotisation
  (À jour / En attente / En retard / Exempté).
- **Bandeau de synchronisation** : indique quand les données ont été mises à jour pour la
  dernière fois. Un bouton **Actualiser** permet de relancer le chargement.

À savoir (V0) :

- La quote-part affichée correspond à la **dernière synchronisation** des données (rafraîchies
  régulièrement), et non à une valeur recalculée en continu seconde par seconde.
- La **variation (1 jour / 30 jours)** et le **mini-graphique de tendance** ne sont **pas encore
  alimentés** : l'historique nécessaire n'est pas encore enregistré (à venir).
- Si vos données ne sont pas encore disponibles, un message l'indique (le trésorier doit d'abord
  synchroniser les données du club). Aucun écran ne reste vide ou cassé.

### 3.2 Portefeuille du club

Le détail des positions détenues par le club :

- **Liste des positions** (actif, type, quantité, PRU, cours, valeur, +/- en € et en %).
- **Répartition sectorielle** sous forme de **graphique en anneau** (donut), avec la valeur
  totale.
- **Tri** (par valeur, nom ou performance) et **filtre par secteur**.
- Sur ordinateur, le détail d'une position s'ouvre dans une **fenêtre dédiée**.

À savoir (V0) :

- La **valorisation est calculée à l'affichage** : quand un cours « live » est disponible, la
  valeur utilise `quantité × cours` ; sinon elle retombe sur la dernière valeur enregistrée lors
  de la synchronisation. La colonne **« Cours »** affiche `—` quand aucun cours live n'est
  disponible.
- L'**historique des transactions** et le mini-graphique par position sont annoncés mais **pas
  encore disponibles**.

### 3.3 Mes cotisations

Le suivi de vos versements :

- **Indicateurs** : total cotisé, nombre de mois cotisés, quote-part.
- **Historique mensuel** sous forme de **frise** (style « graphe de contributions ») : chaque
  mois est coloré selon son statut (Payé, En cours, Retard, Exempté). Cliquez sur un mois pour
  en voir le détail.
- **Statut global** (Situation régulière / En attente / En retard / Exempté) et, le cas échéant,
  un **bandeau de retard** invitant à se rapprocher du trésorier, ainsi qu'un rappel des
  pénalités éventuelles.

À savoir (V0) :

- Les **mois à venir** ne s'affichent pas (seuls les mois enregistrés apparaissent).
- Le bouton **« Télécharger l'attestation de détention »** est présent mais **désactivé**
  (attestation PDF prévue en V1).

---

## 4. Espace trésorier

Réservé aux profils **trésorier**, **président** (ou **admin réseau**). On y accède via l'entrée
**« Espace trésorier »** de la barre latérale ou du menu utilisateur. Une personne sans ce rôle
qui tente d'y accéder voit un écran **« Accès refusé »**.

L'espace est organisé en **4 onglets** :

### 4.1 Tableau de bord (club)

- **Indicateurs du club** : membres actifs, valeur du portefeuille, total cotisé, nombre de
  membres en impayé.
- **Alerte impayés** : signale combien de membres sont en situation d'impayé (statut « en
  retard » / « en attente » ou montant dû).
- **Synchronisation** : bandeau indiquant la dernière mise à jour, avec un bouton **Actualiser**
  pour relancer la synchronisation des données du club.

### 4.2 Membres

- **Liste des membres** du club : nom, rôle, total cotisé, quote-part, mois cotisés, statut.
- **Filtre** : afficher uniquement les membres **en impayé**.
- **Colonne « Accès »** : indique l'état de chaque membre — **Actif**, **Bloqué** ou **Invité**.
- **Menu d'actions** par membre : **Bloquer l'accès** / **Débloquer**, **Voir la fiche**.

### 4.3 Cotisations (club)

- **Frise des cotisations** de l'ensemble du club, avec **indicateurs** (total cotisé, nombre de
  versements, versement moyen).
- **Filtre par membre** pour isoler un adhérent.

### 4.4 Invitations

Permet d'inviter de nouveaux membres et de suivre l'état de chaque invitation.

1. Saisissez l'**email** de la personne à inviter, puis **« Envoyer l'invitation »**.
2. Un **lien d'accès nominatif** est généré, **valable 72 h**. Il s'affiche dans l'écran : vous
   le **copiez** (bouton « Copier le lien ») et le **transmettez vous-même** à l'invité (par le
   canal de votre choix).
3. La personne ouvre le lien → son accès est validé → elle est dirigée vers l'**inscription**
   (avec l'accueil « Vous avez été invité ») → **à l'acceptation, elle devient automatiquement
   membre actif du club** qui l'a invitée. Elle voit alors son tableau de bord, le portefeuille
   et ses cotisations comme tout membre.

Suivi des invitations dans le tableau :

- Colonnes : Email, Date d'envoi, Expire le, Statut, Actions.
- Statuts possibles : **En attente**, **Acceptée**, **Expirée**, **Révoquée**.
- Actions : **Renvoyer l'invitation** (régénère un lien) et **Révoquer l'invitation**.

> Note : l'**envoi automatique de l'invitation par email n'est pas encore actif** (V0). Pour
> l'instant, vous copiez et transmettez le lien manuellement. L'envoi automatique est prévu
> (« à venir »).

### 4.5 Contrôle d'accès d'un membre

Depuis l'onglet **Membres**, le menu d'actions permet de **bloquer** ou **débloquer** l'accès
d'un membre :

- **Bloquer l'accès** : une fenêtre demande confirmation et propose un **motif (facultatif)** —
  Impayé, Départ du club, Suspendu temporairement, Autre. Le membre est **déconnecté
  immédiatement** et ne peut plus accéder à l'espace tant qu'il n'est pas débloqué.
- **Débloquer** : rétablit l'accès du membre.
- L'action est **réversible** à tout moment, et le blocage est **propre à ce club**.

---

## 5. Accès suspendu

Un membre dont l'accès a été **bloqué** par un trésorier ne voit plus l'application : il est
redirigé vers un écran dédié **« Votre accès a été suspendu »**. Cet écran :

- explique que l'accès a été temporairement suspendu (cotisation en attente ou autre motif) ;
- propose **« Contacter mon trésorier »** (ouvre un email vers le trésorier du club, si son
  adresse est connue) ;
- propose **« Me déconnecter »**.

L'accès est rétabli dès qu'un trésorier débloque le membre.

---

## 6. Préférences

Disponibles dans la **barre supérieure** (et aussi sur l'écran de connexion) :

- **Langue** : sélecteur **FR / EN**. Le français est la langue par défaut ; le choix est
  mémorisé. _Note : en anglais, les textes sont traduits, mais les montants et dates restent au
  format français (NBSP, virgule décimale) — l'adaptation complète des formats viendra avec le
  lancement de l'anglais._
- **Thème** : bascule **clair / sombre**.

---

## 7. À venir (non encore disponible)

Fonctionnalités annoncées ou prévues, mais **pas encore actives** aujourd'hui :

- **Envoi automatique des invitations par email** (aujourd'hui : lien à copier et transmettre
  manuellement).
- **Attestation de détention en PDF** (bouton présent mais désactivé).
- **Export CSV** des membres / cotisations (espace trésorier).
- **Variation et graphique de tendance** de la quote-part (1 j / 30 j) et **mini-graphique par
  position** (historique pas encore enregistré).
- **Historique des transactions** du portefeuille.
- **Connexion par passkey** (alternative au lien magique).
- **Réseau des clubs** / annuaire (entrée de navigation visible mais désactivée, marquée
  « Bientôt »).
- **Format des nombres et dates localisé en anglais** (les textes EN sont déjà traduits).
- **Fiche membre détaillée** et **historique des accès** d'un membre (espace trésorier).
