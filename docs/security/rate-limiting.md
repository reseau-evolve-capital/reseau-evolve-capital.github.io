# Rate limiting (OPS-005)

Le rate-limit protège les routes API sensibles ou coûteuses contre l'abus (spam de liens
magiques, rafales de sync, épuisement du quota des providers de cours, génération massive de
PDF). Backend : **Upstash Redis** (sliding window), via `@upstash/ratelimit` + `@upstash/redis`.

La logique est centralisée dans un seul helper : **`apps/web/lib/rate-limit.ts`**. Chaque route
appelle `checkRateLimit(name, key)` puis, en cas de refus, `rateLimitedResponse(retryAfter)`.
Modifier un seuil = modifier l'objet `LIMITERS` dans ce fichier (puis le tableau ci-dessous).

## Endpoints protégés

| Endpoint                     | Méthode | Clé                 | Seuil  | Fenêtre | Fail-open |
| ---------------------------- | ------- | ------------------- | ------ | ------- | --------- |
| `/api/auth/magic-link`       | POST    | IP                  | 5 req  | 10 min  | ✅ oui    |
| `/api/sync`                  | POST    | `club_id` + user id | 1 req  | 5 min   | ✅ oui    |
| `/api/market-prices`         | GET     | IP                  | 60 req | 1 min   | ✅ oui    |
| `/api/attestation/detention` | GET     | user id             | 30 req | 5 min   | ✅ oui    |

### Justification des choix de clé et de seuil

- **`magic-link` — IP, 5/10 min.** Route anonyme (pré-auth) : la seule clé disponible est l'IP.
  Seuil bas pour limiter le spam d'envoi d'emails (anti-abus SMTP).
- **`sync` — (club_id, user), 1/5 min.** La sync Sheets → Postgres est coûteuse. Un trésorier
  n'a pas besoin de la déclencher plus d'une fois par fenêtre ; la clé par couple évite qu'un
  club bloque la sync d'un autre.
- **`market-prices` — IP, 60/min.** Lecture fréquente (le portefeuille rafraîchit les cours).
  Le seuil est généreux pour un usage normal mais borne l'épuisement du quota provider. Clé par
  IP car le quota provider est **global** (pas par utilisateur) : on plafonne la pression sur le
  provider quelle que soit l'identité.
- **`attestation/detention` — user id, 30/5 min.** Route **authentifiée** générant un PDF
  (`renderToBuffer` @react-pdf + QR code) — opération CPU/mémoire non négligeable. Clé par
  **user id** (pas IP) : isole chaque membre, donc un partage d'IP (NAT d'entreprise, réseau
  mobile) ne pénalise pas un membre pour les requêtes d'un autre. 30 req / 5 min couvre largement
  un usage légitime (consultation + quelques re-téléchargements) tout en bloquant une boucle
  d'export abusive.

## Comportement « fail-open » (non négociable)

Un défaut d'infrastructure ne doit **jamais** bloquer une requête légitime. Le helper autorise la
requête (`{ allowed: true }`) dans deux cas :

1. **Upstash non configuré** (variables d'env absentes — typique en dev/CI local). Le helper
   n'instancie alors jamais le client Redis et log **une seule fois par process** :
   `Rate-limit désactivé : variables Upstash absentes.`
2. **Panne Upstash à l'exécution** (réseau, quota, token invalide). L'appel `limit()` est entouré
   d'un `try/catch` ; toute erreur → fail-open + warning.

Conséquence : **en développement local sans Upstash, aucune route n'est limitée** — c'est voulu.
Le rate-limit ne s'active qu'en présence des deux variables d'env.

## Réponse 429

En cas de dépassement, le helper renvoie un `429 Too Many Requests` avec :

- corps JSON `{ "error": "Trop de tentatives. Réessaie dans quelques minutes." }` ;
- header **`Retry-After`** en secondes, dérivé du `reset` Upstash (`ceil((reset - now)/1000)`,
  borné à ≥ 1 s).

## Configurer Upstash

Les variables sont déjà déclarées dans `apps/web/.env.example` :

```bash
UPSTASH_REDIS_REST_URL=https://<votre-instance>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token-rest>
```

1. Créer une base Redis sur [console.upstash.com](https://console.upstash.com).
2. Copier l'URL REST et le token REST dans `apps/web/.env.local` (dev) et dans les variables
   d'environnement Vercel (prod).
3. Redémarrer le serveur. Le rate-limit s'active automatiquement à la présence des deux variables.

## Tests

`apps/web/lib/rate-limit.test.ts` couvre, en mockant `@upstash/ratelimit` / `@upstash/redis`
(aucun vrai Redis) : autorisation sous le seuil, refus + `Retry-After` au-dessus, fail-open sans
Upstash (warning unique), fail-open sur panne `limit()`, et la table des seuils/préfixes par
limiteur. Les tests des routes (`magic-link/route.test.ts`) restent verts (fail-open par défaut,
Upstash absent dans l'environnement de test).
