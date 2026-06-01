# Guide PriceProvider — valorisation live du portefeuille (PFT-007)

## Principe

La valorisation live du portefeuille est calculée **côté frontend** : la DB stocke `quantity` et `symbol` ; le client appelle `GET /api/market-prices?symbols=…` pour obtenir les cours courants, puis calcule `live_value = quantity × live_price` dans `buildPortfolio` (`apps/web/lib/data/portfolio.ts`).

La route `/api/market-prices` délègue à `getPricesWithFallback` de `@evolve/data/prices` (`packages/data/src/prices/getPriceProvider.ts`), qui interroge les providers configurés dans l'ordre de priorité et fusionne les résultats.

Aucune valeur de cours n'est jamais écrite en base lors d'une consultation live. Le champ `market_price_eur` et `market_value` présents en DB sont des **snapshots** issu du dernier sync Sheets → Postgres (Edge Function `sync` toutes les 2 h via `pg_cron`), utilisés en fallback.

---

## Fallback gracieux

**Aucun provider configuré, ou tous les providers en erreur → les prix sont `null` → jamais de crash.**

Le comportement exact dans `buildPortfolio` :

```
livePrice = null  →  currentValue = Number(r.market_value ?? 0)   // snapshot DB
                     gainLossEur  = Number(r.gain_loss_eur ?? …)   // snapshot DB
                     gainLossPct  = gain_loss_pct / 100            // snapshot DB
                     isLive       = false                          // badge "cours" affiché à "—"
```

La colonne « Cours » s'affiche à `—` (valeur nulle, rendue par les helpers `formatEUR` / `TrendBadge` de `@evolve/utils`). Le reste du tableau (valeur liquidative, allocation) continue d'afficher les données du dernier snapshot. Aucun écran vide, aucune exception non interceptée.

Ce comportement est intentionnel (décision de cadrage PFT-007) : en dev, en CI et en production avant le premier déploiement d'un provider, l'app reste pleinement fonctionnelle.

La route `/api/market-prices` est également défensive au niveau de la gestion d'erreurs — si `getPricesWithFallback` lève une exception imprévue, la route retourne `{ prices: { symbol: null, … } }` avec un statut `200` plutôt que de propager une 500.

Cache HTTP de la route : `s-maxage=300, stale-while-revalidate=600` (5 min de cache CDN, 10 min stale).

---

## Providers (ordre de priorité)

`getPricesWithFallback` construit la liste des providers **uniquement à partir des variables d'env présentes**. Chaque provider complète les symboles encore à `null` dans le résultat fusionné (merge union). On s'arrête dès que tous les symboles ont un prix.

| Priorité | Provider                     | Env vars requises                                                                |
| -------- | ---------------------------- | -------------------------------------------------------------------------------- |
| 1        | `GoogleAppsScriptProvider`   | `GOOGLE_APPS_SCRIPT_URL` **et** `GOOGLE_APPS_SCRIPT_SECRET`                      |
| 2        | `GoogleSheetsDirectProvider` | `GOOGLE_SHEETS_PRICE_SHEET_ID` (+ service account Google dans l'env d'exécution) |
| 3        | `AlphaVantageProvider`       | `ALPHA_VANTAGE_KEY`                                                              |

Si aucune de ces variables n'est définie, la liste est vide et `getPricesWithFallback` retourne directement `allNull(symbols)` — aucun provider n'est instancié, aucune erreur.

**Borne MAX_SYMBOLS :** la route limite à **50 symboles** par requête pour protéger le quota des providers (paramètre `symbols` tronqué côté route avant appel à `getPricesWithFallback`).

### GoogleAppsScriptProvider

Appelle une web app Google Apps Script (GAS) déployée manuellement. Le provider passe les symboles en **query param** `?symbols=NASDAQ:META,EURONEXT:MC` et authentifie via le header HTTP :

```
Authorization: Bearer <GOOGLE_APPS_SCRIPT_SECRET>
```

Timeout : 5 s. En cas d'échec (réseau, réponse non-ok), retourne `allNull(symbols)` sans propager l'erreur.

> **Attention — headers custom et Apps Script Web App :** les Web Apps GAS déployées en mode _« Exécuter en tant que : Moi »_ / _« Accès : Tout le monde »_ **ne transmettent pas les headers HTTP custom** (dont `Authorization`) via `e.parameter` ou `e.postData`. Le header `Authorization: Bearer …` est envoyé par le provider TypeScript, mais il **n'est pas accessible** dans `doGet(e)` d'un Apps Script standard (la propriété `e.headers` n'existe pas dans l'API `doGet`).
>
> **Solution recommandée :** lire le secret depuis `e.parameter.secret` dans le `doGet`, et passer côté provider le secret en query param `?secret=…` plutôt qu'en header. Cela implique de **surcharger l'URL** lors de la configuration : `GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/…/exec?secret=<VOTRE_SECRET>`. Le provider ajoutera alors `symbols=…` via `url.searchParams.set`, et le secret sera déjà dans l'URL de base.
>
> Alternativement, si le script est déployé derrière un reverse proxy (Cloud Run, etc.) qui peut relire les headers, la variante Bearer fonctionne nativement.

### GoogleSheetsDirectProvider

Lit une feuille Google Sheets nommée `Prices` (plage `Prices!A2:B1000`) via l'API Sheets v4, en utilisant un **service account** Google. La colonne A contient les symboles, la colonne B contient la formule `=GOOGLEFINANCE(…)` (cours mis à jour par Google Finance). Le service account doit avoir accès en lecture à la feuille.

L'authentification du service account est gérée par `googleapis` via `GoogleAuth` — les credentials sont attendus dans les variables d'environnement standard de Google SDK (`GOOGLE_APPLICATION_CREDENTIALS` pointant vers un fichier JSON, ou `GCLOUD_PROJECT` + Application Default Credentials). Ce provider est adapté à un déploiement sur GCP (Cloud Run, Cloud Functions) où l'ADC est disponible nativement.

### AlphaVantageProvider

Appelle l'endpoint `GLOBAL_QUOTE` d'Alpha Vantage **séquentiellement** pour chaque symbole (pas de batch). Sur le plan de quota gratuit (5 req/min, 500 req/jour), ce provider est adapté à un usage de secours ou à un portefeuille de taille réduite.

---

## Déploiement Google Apps Script (manuel)

Le `GoogleAppsScriptProvider` est le provider principal recommandé pour la production V0. Son déploiement est entièrement manuel.

### Étape 1 — Feuille Prices

1. Créer (ou réutiliser) un Google Sheets partagé avec le service account `GOOGLE_SA_KEY_BASE64`.
2. Ajouter une feuille nommée **`Prices`**.
3. Colonne A (ligne 2 et suivantes) : symboles au format utilisé dans la DB (ex : `NASDAQ:META`, `EURONEXT:MC`, `EPA:TTE`).
4. Colonne B (ligne 2 et suivantes) : formule `=GOOGLEFINANCE(A2,"price")` (copier vers le bas pour toutes les lignes).
5. Vérifier que les cours s'affichent correctement dans la colonne B.

### Étape 2 — Script Apps Script

1. Dans la feuille Prices, ouvrir **Extensions → Apps Script**.
2. Coller le code suivant (voir bloc `code.gs` ci-dessous) en remplacement du contenu existant.
3. Enregistrer.

### Étape 3 — Secret

1. Dans Apps Script, ouvrir **Projet → Paramètres du projet → Propriétés de script**.
2. Ajouter une propriété : clé `SECRET`, valeur = une chaîne aléatoire robuste (ex : `openssl rand -hex 32`).
3. Notera cette valeur — c'est `GOOGLE_APPS_SCRIPT_SECRET` côté Vercel.

### Étape 4 — Déploiement Web App

1. Dans Apps Script, cliquer **Déployer → Nouveau déploiement**.
2. Type : **Web app**.
3. _Exécuter en tant que_ : **Moi** (votre compte Google).
4. _Accès_ : **Tout le monde** (pas besoin d'authentification Google, le secret protège la route).
5. Cliquer **Déployer** et copier l'URL générée (format `https://script.google.com/macros/s/…/exec`).

### Étape 5 — Variables d'env côté Vercel

Dans les **Environment Variables** du projet Vercel (`apps/web`) :

```
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec?secret=<VOTRE_SECRET>
GOOGLE_APPS_SCRIPT_SECRET=<VOTRE_SECRET>
```

> Le secret est passé **dans l'URL de base** (`?secret=…`) car les Apps Script Web Apps standard ne transmettent pas les headers HTTP custom comme `Authorization`. Le provider TypeScript ajoute ensuite `?symbols=…` via `url.searchParams.set` — les deux query params coexistent dans l'URL finale.
> `GOOGLE_APPS_SCRIPT_SECRET` reste requis dans l'env pour que `configuredProviders()` instancie le provider (vérification de présence à la construction).

---

## code.gs — à coller dans Apps Script

```javascript
/**
 * Evolve Capital — Price Provider endpoint (PFT-007)
 * Déployer en tant que Web App : Exécuter = Moi / Accès = Tout le monde.
 *
 * Le secret est transmis en query param ?secret=… (les headers custom ne
 * sont pas accessibles dans doGet d'une Apps Script Web App standard).
 *
 * Réponse : { prices: { "NASDAQ:META": 512.34, "EURONEXT:MC": 732.10, ... } }
 */
function doGet(e) {
  // Validation du secret
  var props = PropertiesService.getScriptProperties()
  var expected = props.getProperty('SECRET')
  var provided = e.parameter['secret']
  if (!expected || provided !== expected) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized' })).setMimeType(
      ContentService.MimeType.JSON
    )
  }

  // Lecture des symboles
  var symbolsParam = e.parameter['symbols'] || ''
  var symbols = symbolsParam
    .split(',')
    .map(function (s) {
      return s.trim()
    })
    .filter(Boolean)
  if (symbols.length === 0) {
    return ContentService.createTextOutput(JSON.stringify({ prices: {} })).setMimeType(
      ContentService.MimeType.JSON
    )
  }

  // Lecture de la feuille Prices (A: symbole, B: =GOOGLEFINANCE)
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Prices')
  var lastRow = sheet.getLastRow()
  var prices = {}

  if (lastRow >= 2) {
    var data = sheet.getRange(2, 1, lastRow - 1, 2).getValues()
    var map = {}
    for (var i = 0; i < data.length; i++) {
      var sym = String(data[i][0]).trim()
      var price = data[i][1]
      if (sym && typeof price === 'number' && isFinite(price) && price > 0) {
        map[sym] = price
      }
    }
    for (var j = 0; j < symbols.length; j++) {
      var s = symbols[j]
      if (map[s] !== undefined) prices[s] = map[s]
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ prices: prices })).setMimeType(
    ContentService.MimeType.JSON
  )
}
```

---

## Sécurité

- `GOOGLE_APPS_SCRIPT_SECRET`, `GOOGLE_SHEETS_PRICE_SHEET_ID` et `ALPHA_VANTAGE_KEY` sont des variables **server-only** : elles ne sont jamais préfixées `NEXT_PUBLIC_` et ne transitent jamais dans le bundle client.
- La route `/api/market-prices` exige une session Supabase valide (`auth.getUser()` → 401 si absent). Un utilisateur non connecté ne peut pas appeler les providers et consommer leur quota.
- Le `doGet` Apps Script valide le secret avant tout traitement — une URL devinée sans le bon secret reçoit une réponse `{ error: 'Unauthorized' }`.
- `SUPABASE_SERVICE_ROLE_KEY` est un secret distinct, utilisé uniquement dans `supabase/functions/`. Il n'intervient pas dans la chaîne PriceProvider.
