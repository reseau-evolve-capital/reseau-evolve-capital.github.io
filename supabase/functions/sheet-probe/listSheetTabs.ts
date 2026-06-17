// Énumère les ONGLETS (titres) d'une feuille Google Sheets via l'API REST
// `spreadsheets.get` — pendant LECTURE SEULE de `readSheet` (NET-004 / sheet-probe).
//
// POURQUOI un module à part : `readSheet` (sync) lit les VALEURS d'un onglet précis
// (`spreadsheets.values.get`) mais n'expose JAMAIS la liste des onglets. Le dry-run de
// validation de matrice (sheet-probe) a besoin de cette liste pour comparer aux onglets
// attendus. On réplique donc la MÊME auth Service Account (JWT RS256 / Web Crypto, scope
// `spreadsheets.readonly`, GOOGLE_SA_KEY_BASE64) que readSheet, puis on appelle
// `GET /v4/spreadsheets/{id}?fields=sheets.properties.title` (métadonnées seules — aucune
// cellule lue, aucune écriture possible).
//
// AUCUNE dépendance Node — 100 % Web standard (Deno Edge runtime), comme readSheet.ts.
// Réf : supabase/functions/sync/readSheet.ts (auth identique), CLAUDE.md (SA partagé,
// SHEET_ID jamais en env), DATA_MODEL §5.

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

/** Décode une chaîne base64 standard en Uint8Array (corps DER de la clé PKCS#8). */
function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Lit et décode la clé de service depuis GOOGLE_SA_KEY_BASE64. Throw si absente/malformée. */
function loadServiceAccount(): ServiceAccountKey {
  const raw = Deno.env.get('GOOGLE_SA_KEY_BASE64')
  if (!raw) {
    throw new Error("GOOGLE_SA_KEY_BASE64 manquante dans l'environnement de la fonction.")
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(atob(raw))
  } catch (cause) {
    throw new Error(`GOOGLE_SA_KEY_BASE64 illisible (base64/JSON invalide): ${String(cause)}`)
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
    // Deno 2.8 : importKey attend un BufferSource sur ArrayBuffer (pas ArrayBufferLike) ;
    // base64ToBytes alloue un Uint8Array exact, donc on narrow le type du buffer (gotcha connu, cf. readSheet.ts).
    der as Uint8Array<ArrayBuffer>,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
}

/** Construit et signe un JWT RS256 pour l'échange OAuth2 Service Account (scope read-only). */
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
 * Erreur typée portant le statut HTTP renvoyé par Google sur l'appel `spreadsheets.get`.
 * Le handler sheet-probe la traduit en réponse actionnable (403 → not_shared, 404 → invalid_id).
 */
export class SheetMetaError extends Error {
  constructor(
    message: string,
    /** Statut HTTP renvoyé par l'API Google Sheets (403, 404, …) ; 0 si erreur non-HTTP. */
    readonly httpStatus: number
  ) {
    super(message)
    this.name = 'SheetMetaError'
  }
}

/** Email du Service Account partagé (pour le message « partage la feuille avec … »). */
export function serviceAccountEmail(): string | null {
  try {
    return loadServiceAccount().client_email
  } catch {
    return null
  }
}

/**
 * Liste les TITRES des onglets d'une feuille Google Sheets (LECTURE SEULE des métadonnées).
 *
 * Appelle `GET /v4/spreadsheets/{id}?fields=sheets.properties.title` avec le token du
 * Service Account. Ne lit AUCUNE cellule et n'écrit jamais rien (impossible sur ce endpoint).
 *
 * Erreurs : throw `SheetMetaError` portant `httpStatus` (403 = feuille non partagée avec le SA,
 * 404 = feuille introuvable / ID invalide) pour que le handler produise une réponse actionnable.
 */
export async function listSheetTabs(sheetId: string): Promise<string[]> {
  const sa = loadServiceAccount()
  const jwt = await buildSignedJwt(sa)
  const token = await fetchAccessToken(jwt)

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    sheetId
  )}?fields=${encodeURIComponent('sheets.properties.title')}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const detail = await res.text()
    throw new SheetMetaError(
      `Lecture des métadonnées de la feuille échouée (HTTP ${res.status}): ${detail}`,
      res.status
    )
  }
  const json: unknown = await res.json()
  const sheets = (json as { sheets?: unknown })?.sheets
  if (!Array.isArray(sheets)) {
    throw new SheetMetaError('Réponse Sheets inattendue : "sheets" non tableau.', 0)
  }
  return sheets
    .map((s) => {
      const title = (s as { properties?: { title?: unknown } })?.properties?.title
      return typeof title === 'string' ? title : ''
    })
    .filter((t) => t !== '')
}
