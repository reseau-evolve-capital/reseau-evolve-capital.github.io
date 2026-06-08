# Runbook — Déploiement Strapi (apps/cms) sur DigitalOcean derrière Traefik

> Cible : droplet Ubuntu existant (1 vCPU / 2 Go RAM / 2 Go swap) qui fait déjà tourner
> **LibreChat** + un **Traefik v3** (projet `/opt/proxy`, ports 80/443, réseau externe `web`,
> certresolver `le`). Strapi est ajouté comme **projet compose isolé** (`-p strapi`) — il ne
> touche ni LibreChat ni Traefik.
>
> **Tout ce qui touche le droplet est fait par l'humain.** Les artefacts (Dockerfile, CI,
> compose, scripts, config) sont versionnés dans le dépôt. L'image est **construite en CI**
> et **tirée** par le droplet — on ne build JAMAIS sur le droplet (2 Go → OOM).

---

## 0. Décisions actées & prérequis humains

| Sujet                        | Décision                                                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nom d'image GHCR             | **`ghcr.io/reseau-evolve-capital/rec-cms`** (`:latest` + `:<sha>`)                                                                                       |
| Accès GHCR depuis le droplet | **Image privée + `docker login` par PAT** (`read:packages`)                                                                                              |
| Base de données              | **Postgres dédié** (`postgres:16-alpine`), volume `strapi_strapi-db-data`                                                                                |
| Médias                       | **Volume local** `strapi_strapi-uploads` ; DO Spaces/S3 = upgrade **différé**                                                                            |
| Contenu initial              | **Migrer** la DB locale + `public/uploads` vers le droplet (étape 8)                                                                                     |
| Domaine                      | **`strapi.reseauevolvecapital.com`** (sous-domaine ; la vitrine occupe l'**apex** `reseauevolvecapital.com` sur GitHub Pages → coexistence sans conflit) |

**À trancher / préparer par l'humain avant de commencer :**

1. **PAT GitHub** (classic) avec scope **`read:packages`** — pour que le droplet tire l'image privée.
2. **Zone DNS `reseauevolvecapital.com`** accessible : on **ajoute** un A-record pour le
   sous-domaine `strapi` (étape 1) **sans toucher** aux enregistrements de l'apex qui pointent
   déjà la vitrine vers GitHub Pages.
3. **DigitalOcean Droplet Backups** : recommandé **ON** (~20 % du coût du droplet, hebdo,
   off-droplet — couvre DB **et** volume médias). À activer dans le panneau DO (étape 9).
4. **RAM** : 2 Go + 2 Go swap avec LibreChat déjà présent, c'est **serré**. Prévoir de vérifier
   `docker stats` après déploiement (étape 7) et envisager un **droplet 4 Go** si Strapi rame
   ou se fait OOM-kill.

---

## 1. DNS — ajouter l'A-record du sous-domaine `strapi`

> ⚠ **Ne pas toucher aux enregistrements de l'apex** `reseauevolvecapital.com` (et `www`) qui
> pointent la **vitrine** vers GitHub Pages. On **ajoute uniquement** un sous-domaine `strapi`.
> Apex (vitrine, GitHub Pages) et `strapi.*` (droplet) coexistent sans conflit.

Chez le registrar / la zone DNS de `reseauevolvecapital.com`, **ajouter** :

```
Type   Nom      Valeur                  TTL
A      strapi   <IP_PUBLIQUE_DROPLET>   3600
```

- **Nom** : `strapi` (certains panneaux exigent le FQDN `strapi.reseauevolvecapital.com`).
- **Valeur** : l'**IP publique IPv4** du droplet (DigitalOcean → Droplet → champ « ipv4 »).
- Si le droplet a une **IPv6**, ajouter aussi un enregistrement `AAAA strapi <IPv6>` (optionnel).
- **Ne pas** créer de CNAME pour `strapi` (un A-record direct vers l'IP est le plus simple ici).
- **Pas de redirection / forwarding** à configurer côté registrar : la redirection HTTP→HTTPS
  est gérée globalement par **Traefik** sur le droplet, pas par le DNS.

Vérifier la propagation (depuis votre poste) :

```bash
dig +short strapi.reseauevolvecapital.com   # doit renvoyer l'IP publique du droplet
```

> Ne pas lancer le déploiement avant que le DNS résolve : Traefik a besoin que le domaine
> pointe sur le droplet pour obtenir le certificat Let's Encrypt (challenge ACME HTTP-01).

## 2. Déposer compose + .env + scripts sur le droplet

```bash
ssh root@<DROPLET>
mkdir -p /opt/strapi
```

Depuis le poste de dev (le dépôt est la source de vérité — pas besoin de cloner le monorepo
entier sur le droplet, l'image est pré-buildée) :

```bash
scp apps/cms/docker-compose.production.yml   root@<DROPLET>:/opt/strapi/
scp apps/cms/.env.production.example          root@<DROPLET>:/opt/strapi/
scp apps/cms/scripts/deploy-production.sh     root@<DROPLET>:/opt/strapi/
scp apps/cms/scripts/backup-db.sh             root@<DROPLET>:/opt/strapi/
```

Sur le droplet, créer le `.env` réel (gitignoré, jamais commité) :

```bash
cd /opt/strapi
cp .env.production.example .env
chmod 600 .env
# Générer les secrets (5 entrées ; APP_KEYS = 4 valeurs séparées par des virgules) :
openssl rand -base64 32   # à répéter pour chaque secret
nano .env                 # remplir tous les __CHANGE_ME__ + DATABASE_PASSWORD fort
chmod +x deploy-production.sh backup-db.sh
```

`.env` minimum à renseigner : `APP_KEYS` (×4), `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`,
`TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `DATABASE_PASSWORD`. `URL` et `IS_PROXIED=true` sont déjà
dans le modèle.

## 3. Login GHCR (image privée)

```bash
echo "<PAT_read_packages>" | docker login ghcr.io -u lionelzoc --password-stdin
```

> Le PAT n'a besoin que de `read:packages`. Le login persiste dans `~/.docker/config.json`.
> (Alternative non retenue : rendre le package public → pas de login nécessaire.)

## 4. Vérifier que le réseau Traefik existe

```bash
docker network inspect web >/dev/null 2>&1 && echo "réseau web OK" || echo "❌ démarrer Traefik (/opt/proxy)"
docker ps --format '{{.Names}}' | grep -i traefik   # Traefik doit tourner
```

Le compose déclare `web` en `external: true` — il ne le crée pas. Si absent, démarrer d'abord
le projet Traefik existant.

## 5. (Recommandé) Migrer le contenu AVANT le premier démarrage de Strapi

> Choix acté : on amène la DB + les médias existants. **Faire la restauration DB AVANT que
> Strapi ne démarre** (Strapi crée son schéma au premier boot ; restaurer après créerait des
> conflits de tables). Si vous préférez démarrer à vide, sautez à l'étape 6.

**5a. Dump de la DB locale** (sur le poste de dev, Postgres local du blog = conteneur `strapiDB`) :

```bash
docker exec strapiDB pg_dump -U strapi -d strapi --no-owner --no-privileges \
  > strapi-content.sql
tar czf uploads.tgz -C apps/cms/public/uploads .
scp strapi-content.sql uploads.tgz root@<DROPLET>:/opt/strapi/
```

**5b. Sur le droplet — démarrer la DB seule, restaurer, puis injecter les médias :**

```bash
cd /opt/strapi
COMPOSE="docker compose -p strapi -f docker-compose.production.yml"
$COMPOSE up -d strapi-db
# attendre healthy
until docker exec strapi-db pg_isready -U strapi -d strapi; do sleep 2; done
# restaurer le contenu dans la base fraîche
cat strapi-content.sql | docker exec -i strapi-db psql -U strapi -d strapi
# copier les médias dans le volume nommé (project_volume = strapi_strapi-uploads)
docker run --rm -v strapi_strapi-uploads:/v -v /opt/strapi:/src alpine \
  sh -c 'cd /v && tar xzf /src/uploads.tgz'
docker volume ls | grep strapi   # confirmer strapi_strapi-uploads & strapi_strapi-db-data
```

> ⚠ Les **bytes** des images _legacy_ (ancien Supabase Storage mort) ne sont pas récupérables —
> certains enregistrements `files` pointent encore vers des URLs `*.supabase.co` en 404. Seuls
> les médias **re-uploadés** (présents dans `public/uploads`) sont migrés. Re-uploader le reste
> via l'admin si besoin.

## 6. Premier déploiement

```bash
cd /opt/strapi
./deploy-production.sh         # = pull image GHCR + up -d (jamais de build ici)
docker compose -p strapi -f docker-compose.production.yml logs -f strapi
```

Attendre `Strapi started` / `http://0.0.0.0:1337`. Le `bootstrap` de `src/index.ts` ré-accorde
les permissions **publiques** `find/findOne` sur `article/category/author/tag` (idempotent) —
indispensable pour que la vitrine fetch en anonyme.

## 7. Vérifier HTTPS via Traefik + la RAM

```bash
# Depuis votre poste :
curl -I http://strapi.reseauevolvecapital.com            # → 301/308 vers https (redirect global)
curl -I https://strapi.reseauevolvecapital.com/admin     # → 200, certificat Let's Encrypt valide
curl -gs "https://strapi.reseauevolvecapital.com/api/articles?pagination[pageSize]=1" | head -c 200  # -g : crochets [ ] non globés
```

```bash
# Sur le droplet — surveiller la cohabitation mémoire avec LibreChat :
docker stats --no-stream
```

> Si le certificat n'est pas émis : vérifier que le DNS résout (étape 1), que le port 443 est
> ouvert, et les logs Traefik (`docker logs <traefik>`). Le challenge ACME HTTP-01 a besoin du
> domaine joignable en HTTP.

## 8. Compte admin

- **Si vous avez migré (étape 5)** : les comptes admin existent mais leur mot de passe est
  inconnu → le réinitialiser :

  ```bash
  docker exec -it strapi yarn strapi admin:reset-user-password \
    --email lionel@omniventus.com --password '<nouveau_mdp_fort>'
  ```

- **Si départ à vide** : créer le premier admin via l'écran `/admin` (premier lancement) ou :

  ```bash
  docker exec -it strapi yarn strapi admin:create-user \
    --email admin@evolve.example --password '<mdp>' --firstname Admin --lastname User
  ```

## 9. Smoke test

1. Se connecter à `https://strapi.reseauevolvecapital.com/admin`.
2. `GET /api/articles?locale=fr` renvoie des données (200, `data` non vide).
3. Une image d'upload s'ouvre en HTTPS : `https://strapi.reseauevolvecapital.com/uploads/<fichier>`.
4. (Si migration) les articles « La Quote-Part » apparaissent dans le Content Manager.

## 10. Sauvegardes

```bash
# Cron quotidien (pg_dump + rétention 7 j) :
crontab -e
# Ajouter :
0 3 * * * cd /opt/strapi && ./backup-db.sh >> /var/log/strapi-backup.log 2>&1
```

Activer en plus les **DigitalOcean Droplet Backups** (panneau DO) — couverture off-droplet de
la DB **et** du volume médias.

## 11. Réactiver le déploiement de la vitrine

Le workflow `.github/workflows/deploy-vitrine.yml` est **réactivé** et pointe par défaut sur
`https://strapi.reseauevolvecapital.com`. Il porte une **garde anti-blog-vide** (échoue si Strapi
ne renvoie aucun article → ne publie jamais un blog vide par-dessus le live).

- Optionnel : définir des **variables de dépôt** GitHub `NEXT_PUBLIC_STRAPI_API_URL`
  (`…/api`) et `NEXT_PUBLIC_STRAPI_URL` pour surcharger les valeurs par défaut.
- Déclencher un rebuild manuel : onglet **Actions → Deploy Vitrine → Run workflow**.
- Pour rebuild le blog **quand le contenu change** (sans commit) : câbler un **webhook Strapi**
  (Settings → Webhooks) vers un `repository_dispatch` GitHub de type `strapi-content-update`
  (suivi non bloquant — à faire après le premier déploiement).

---

## Rollback

- **Application** : redéployer une image antérieure connue-bonne. Repérer le tag `:<sha>` dans
  GHCR, puis sur le droplet :

  ```bash
  cd /opt/strapi
  # éditer docker-compose.production.yml → image: ghcr.io/reseau-evolve-capital/rec-cms:<sha_precedent>
  docker compose -p strapi -f docker-compose.production.yml up -d
  ```

- **Base de données** : restaurer le dernier dump :

  ```bash
  gunzip -c /opt/strapi/backups/strapi-<stamp>.sql.gz \
    | docker exec -i strapi-db psql -U strapi -d strapi
  docker compose -p strapi -f docker-compose.production.yml restart strapi
  ```

> ⚠ **Ne JAMAIS exécuter `docker compose down -v`** : `-v` supprime les volumes nommés
> (`strapi_strapi-db-data`, `strapi_strapi-uploads`) → perte de la DB **et** des médias.
> Pour arrêter sans risque : `docker compose -p strapi -f docker-compose.production.yml down`
> (sans `-v`).

---

## Suivis (hors périmètre du premier déploiement)

- **Webhook contenu → rebuild vitrine** (`repository_dispatch strapi-content-update`).
- **Upgrade médias DO Spaces / S3** : justifié seulement si les médias grossissent beaucoup,
  qu'on veut un CDN, ou qu'on dépasse **une seule instance** Strapi (un volume local ne se
  partage pas entre réplicas). Les providers `strapi-provider-upload-do` et
  `strapi-provider-upload-supabase` sont déjà dans `package.json` → bascule config-only.
- **Droplet 4 Go** si la cohabitation RAM avec LibreChat est trop juste.
