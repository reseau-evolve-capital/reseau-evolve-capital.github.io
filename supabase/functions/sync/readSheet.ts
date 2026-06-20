// Lecteur Google Sheets pour le runtime Deno (Supabase Edge Functions).
// La lib Node `googleapis` n'est PAS utilisable ici : on implémente nous-mêmes
// l'auth Service Account (JWT RS256 signé via Web Crypto) puis l'appel REST
// `spreadsheets.values.get`. Aucune dépendance Node — 100 % Web standard.
//
// Réf : DATA_MODEL §5 (cycle de sync), CLAUDE.md (SHEET_ID jamais en env, GOOGLE_SA_KEY_BASE64 partagé).

/** Forme minimale de la clé de service Google attendue dans GOOGLE_SA_KEY_BASE64 (JSON base64). */
interface ServiceAccountKey {
  client_email: string
  private_key: string
}

/** Encode un ArrayBuffer / Uint8Array en base64url (sans padding) — format requis par JWT. */
function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Encode une chaîne UTF-8 en base64url. */
function base64UrlEncodeString(value: string): string {
  return base64UrlEncode(new TextEncoder().encode(value))
}

/** Décode une chaîne base64 standard en Uint8Array (utilisé pour le corps DER de la clé PKCS#8). */
function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Normalise une chaîne base64 (ou base64url) avant de la passer à `atob()`.
 *
 * `GOOGLE_SA_KEY_BASE64` peut être généré sans padding `=` (ex. `base64 -w0` tronqué,
 * copier-coller depuis certains outils), ce qui fait lever « Invalid character » dans
 * `atob()` en Deno dès que la longueur n'est pas un multiple de 4.
 *
 * Opérations :
 *   1. retire les espaces et sauts de ligne ;
 *   2. convertit base64url (`-`/`_`) en base64 standard (`+`/`/`) par sécurité ;
 *   3. ré-ajoute le padding `=` manquant pour une longueur multiple de 4.
 *
 * N'est PAS utilisée sur les données PEM internes (déjà nettoyées par `importPrivateKey`).
 */
function normalizeBase64(s: string): string {
  let b64 = s.replace(/[\s\r\n]/g, '')
  b64 = b64.replace(/-/g, '+').replace(/_/g, '/')
  const rem = b64.length % 4
  if (rem === 2) b64 += '=='
  else if (rem === 3) b64 += '='
  return b64
}

/** Lit et décode la clé de service depuis GOOGLE_SA_KEY_BASE64. Throw si absente/malformée. */
function loadServiceAccount(): ServiceAccountKey {
  const raw = Deno.env.get('GOOGLE_SA_KEY_BASE64')
  if (!raw) {
    throw new Error("GOOGLE_SA_KEY_BASE64 manquante dans l'environnement de la fonction.")
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(atob(normalizeBase64(raw)))
  } catch (cause) {
    // Ne pas logger `raw` (contient la clé privée).
    throw new Error(`GOOGLE_SA_KEY_BASE64 illisible (base64/JSON invalide) : ${String(cause)}`)
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).client_email !== 'string' ||
    typeof (parsed as Record<string, unknown>).private_key !== 'string'
  ) {
    throw new Error('GOOGLE_SA_KEY_BASE64 : champs client_email / private_key manquants.')
  }
  const obj = parsed as Record<string, unknown>
  return { client_email: obj.client_email as string, private_key: obj.private_key as string }
}

/** Importe une clé privée PKCS#8 PEM en CryptoKey RSASSA-PKCS1-v1_5 / SHA-256 pour signature. */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const der = base64ToBytes(
    pem
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s+/g, '')
  )
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
}

/** Construit et signe un JWT RS256 pour l'échange OAuth2 Service Account. */
async function buildSignedJwt(sa: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }
  const signingInput = `${base64UrlEncodeString(JSON.stringify(header))}.${base64UrlEncodeString(
    JSON.stringify(claims)
  )}`
  const key = await importPrivateKey(sa.private_key)
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    new TextEncoder().encode(signingInput)
  )
  return `${signingInput}.${base64UrlEncode(signature)}`
}

/** Échange le JWT signé contre un access_token OAuth2. Throw si Google refuse. */
async function fetchAccessToken(jwt: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    throw new Error(`Échange OAuth2 échoué (HTTP ${res.status}): ${await res.text()}`)
  }
  const json: unknown = await res.json()
  const token = (json as Record<string, unknown>)?.access_token
  if (typeof token !== 'string') {
    throw new Error('Réponse OAuth2 sans access_token.')
  }
  return token
}

/**
 * Lit une plage d'une feuille et renvoie une matrice string[][].
 * `range` est optionnel et vaut 'A1:AZ2000' par défaut — INCHANGÉ pour les 6 feuilles
 * historiques. Raison du paramètre : la feuille REPORTING (série quotidienne, ~2 900+
 * lignes depuis 2018) DÉPASSE cette plage par défaut, qui tronquerait silencieusement
 * la série — elle est donc lue avec une plage explicite plus large ('A1:E10000').
 * Chaque cellule est coercée en string (null/absente → '') pour coller au contrat
 * des parsers/mappers (qui attendent tous des string).
 */
export async function readSheet(
  sheetId: string,
  sheetName: string,
  range = 'A1:AZ2000'
): Promise<string[][]> {
  const sa = loadServiceAccount()
  const jwt = await buildSignedJwt(sa)
  const token = await fetchAccessToken(jwt)

  // Le nom d'onglet est encodé (espaces, accents) ; la notation A1 reste brute
  // (`!`, `:` sont légaux en path segment — URL byte-identique à l'historique).
  const encodedRange = `${encodeURIComponent(sheetName)}!${range}`
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    sheetId
  )}/values/${encodedRange}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    throw new Error(
      `Lecture feuille "${sheetName}" échouée (HTTP ${res.status}): ${await res.text()}`
    )
  }
  const json: unknown = await res.json()
  const values = (json as Record<string, unknown>)?.values
  if (values == null) return []
  if (!Array.isArray(values)) {
    throw new Error(`Réponse Sheets inattendue pour "${sheetName}" : "values" non tableau.`)
  }
  return values.map((row) => {
    const cells = Array.isArray(row) ? row : []
    return cells.map((cell) => (cell == null ? '' : String(cell)))
  })
}
