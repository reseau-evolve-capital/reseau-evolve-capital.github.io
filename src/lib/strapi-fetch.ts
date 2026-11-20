import qs from 'qs'

export class StrapiError extends Error {
  constructor(message: string, public status: number | null) {
    super(message)
    this.name = 'StrapiError'
  }
}

const API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337/api'

// Contrairement au blog (api.ts), toute erreur fait échouer le build : jamais de site vide publié.
export async function strapiGet<T>(path: string, query?: object): Promise<T> {
  const url = `${API_URL}${path}${query ? `?${qs.stringify(query, { encodeValuesOnly: true })}` : ''}`
  let res: Response
  try {
    res = await fetch(url, { cache: 'force-cache' })
  } catch (err) {
    throw new StrapiError(`Strapi injoignable (${url}) : ${(err as Error).message}`, null)
  }
  if (!res.ok) throw new StrapiError(`Strapi ${res.status} sur ${url} : ${await res.text()}`, res.status)
  return res.json() as Promise<T>
}
