import type { Core } from '@strapi/strapi'
import { seedEdition01 } from './seeds/edition-01'

// Content-types du blog exposés en LECTURE PUBLIQUE : le site vitrine consomme l'API Strapi
// en anonyme (pas d'API token côté build). Sans ces permissions, /api/articles répond 403
// et le blog se build vide.
const PUBLIC_READ_UIDS = [
  'api::article.article',
  'api::category.category',
  'api::author.author',
  'api::tag.tag',
] as const
const PUBLIC_READ_ACTIONS = ['find', 'findOne'] as const

// --- Rebuild de la vitrine (blog statique) au changement de contenu ----------------------
// À la publication / dépublication / suppression d'un contenu éditorial, on déclenche un
// `repository_dispatch` GitHub → le workflow deploy-vitrine.yml rebuild le blog SSG avec le
// contenu à jour. Le webhook NATIF de Strapi ne convient pas (son corps ≠ `{ event_type }`
// exigé par l'API GitHub), d'où ce déclenchement côté code.
// NO-OP sans `GITHUB_DISPATCH_TOKEN` → inactif en local et tant que le secret n'est pas posé.
const REBUILD_UIDS = [
  'api::article.article',
  'api::category.category',
  'api::author.author',
  'api::tag.tag',
]
const REBUILD_ACTIONS = ['publish', 'unpublish', 'delete']

async function triggerVitrineRebuild(strapi: Core.Strapi, reason: string): Promise<void> {
  const token = process.env.GITHUB_DISPATCH_TOKEN
  if (!token) {
    strapi.log.debug('[rebuild] GITHUB_DISPATCH_TOKEN absent → dispatch ignoré (no-op).')
    return
  }
  const repo =
    process.env.GITHUB_DISPATCH_REPO || 'reseau-evolve-capital/reseau-evolve-capital.github.io'
  const eventType = process.env.GITHUB_DISPATCH_EVENT_TYPE || 'strapi-content-update'
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event_type: eventType, client_payload: { reason } }),
    })
    if (res.ok) {
      strapi.log.info(`[rebuild] vitrine déclenchée (${reason}) → ${repo} [${eventType}]`)
    } else {
      strapi.log.error(`[rebuild] dispatch GitHub échec ${res.status} : ${await res.text()}`)
    }
  } catch (err) {
    strapi.log.error(`[rebuild] dispatch GitHub erreur : ${(err as Error).message}`)
  }
}

export default {
  /**
   * Enregistre un middleware Document Service qui déclenche le rebuild de la vitrine
   * sur publish/unpublish/delete des contenus éditoriaux. Fire-and-forget : ne bloque
   * jamais l'opération admin, ne lève jamais (erreurs loggées). Cf. GITHUB_DISPATCH_* (.env).
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    strapi.documents.use(async (context, next) => {
      const result = await next()
      const uid = String((context as { uid?: string }).uid ?? '')
      const action = String((context as { action?: string }).action ?? '')
      if (REBUILD_UIDS.includes(uid) && REBUILD_ACTIONS.includes(action)) {
        void triggerVitrineRebuild(strapi, `${uid}:${action}`)
      }
      return result
    })
  },

  /**
   * Accorde au rôle "public" les permissions find/findOne sur les content-types du blog,
   * de façon IDEMPOTENTE, à chaque démarrage.
   *
   * Indispensable : ces permissions ne sont PAS dans le dump restauré (l'ancien front utilisait
   * un API token). Sans ce bootstrap, /api/articles → 403 et le blog se build vide. Reproductible
   * après un `make strapi-db-restore` (qui réécrase le schéma public). Voir apps/vitrine/CLAUDE.md.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const publicRole = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } })

    if (!publicRole) {
      strapi.log.warn('[bootstrap] rôle "public" introuvable — permissions blog non accordées.')
      return
    }

    for (const uid of PUBLIC_READ_UIDS) {
      for (const action of PUBLIC_READ_ACTIONS) {
        const permAction = `${uid}.${action}`
        const existing = await strapi
          .query('plugin::users-permissions.permission')
          .findOne({ where: { action: permAction, role: publicRole.id } })

        if (!existing) {
          await strapi
            .query('plugin::users-permissions.permission')
            .create({ data: { action: permAction, role: publicRole.id } })
          strapi.log.info(`[bootstrap] permission publique accordée : ${permAction}`)
        }
      }
    }

    // Seed optionnel de l'édition 01 (EDI-002) — uniquement sur demande explicite.
    // Usage : `SEED_EDITION_01=1 make strapi-dev` (idempotent). Voir docs/editorial/.
    if (process.env.SEED_EDITION_01 === '1') {
      try {
        await seedEdition01(strapi)
      } catch (err) {
        strapi.log.error(`[seed] échec du seed édition 01 : ${(err as Error).message}`)
      }
    }
  },
}
