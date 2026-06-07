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

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

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
