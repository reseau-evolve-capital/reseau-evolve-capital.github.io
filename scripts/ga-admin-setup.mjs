#!/usr/bin/env node
/**
 * Configure la propriete Google Analytics 4 via l'Admin API :
 *   - dimensions personnalisees (portee EVENEMENT) ;
 *   - evenements cles (key events).
 *
 * Idempotent et reutilisable : relancable sans risque, ne cree que ce qui manque.
 * Le plan de mesure ci-dessous reflete les events emis dans src/lib/analytics.ts.
 *
 * Auth : Application Default Credentials. Fournir un compte de service ayant le role
 * Editeur sur la propriete, via l'une de ces methodes :
 *   - GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/sa.json
 *   - gcloud auth application-default login
 * L'Admin API doit etre activee : analyticsadmin.googleapis.com.
 *
 * Usage :
 *   GA_PROPERTY_ID=540972704 GOOGLE_APPLICATION_CREDENTIALS=./sa.json \
 *     node scripts/ga-admin-setup.mjs
 *   node scripts/ga-admin-setup.mjs --dry-run   # liste l'existant + le manquant, sans ecrire
 */
import { AnalyticsAdminServiceClient } from '@google-analytics/admin'

const PROPERTY_ID = process.env.GA_PROPERTY_ID ?? '540972704'
const DRY_RUN = process.argv.includes('--dry-run')

// Dimensions personnalisees, portee EVENEMENT. `parameterName` = le parametre emis a gtag.
const CUSTOM_DIMENSIONS = [
  {
    parameterName: 'cta_target',
    displayName: 'CTA cible',
    description: "Cible du clic CTA (event cta_click).",
  },
  {
    parameterName: 'article_slug',
    displayName: 'Article slug',
    description: "Slug de l'article blog (event blog_article_read).",
  },
  {
    parameterName: 'article_category',
    displayName: 'Article categorie',
    description: "Categorie de l'article blog (event blog_article_read).",
  },
  {
    parameterName: 'form_location',
    displayName: 'Emplacement formulaire',
    description: "Emplacement du formulaire de contact (event contact_form_submit).",
  },
  {
    parameterName: 'surface',
    displayName: 'Surface newsletter',
    description: "Surface d'inscription newsletter (event newsletter_signup).",
  },
]

// Evenements cles (conversions). ONCE_PER_EVENT = compte chaque occurrence.
const KEY_EVENTS = ['contact_form_submit', 'newsletter_signup', 'blog_article_read']

async function syncCustomDimensions(client, parent) {
  const [existing] = await client.listCustomDimensions({ parent })
  const known = new Set(existing.map((d) => d.parameterName))
  for (const dim of CUSTOM_DIMENSIONS) {
    if (known.has(dim.parameterName)) {
      console.log(`  = dimension ${dim.parameterName} (deja presente)`)
      continue
    }
    if (DRY_RUN) {
      console.log(`  + dimension ${dim.parameterName} (a creer)`)
      continue
    }
    await client.createCustomDimension({ parent, customDimension: { ...dim, scope: 'EVENT' } })
    console.log(`  + dimension ${dim.parameterName} creee`)
  }
}

async function syncKeyEvents(client, parent) {
  const [existing] = await client.listKeyEvents({ parent })
  const known = new Set(existing.map((k) => k.eventName))
  for (const eventName of KEY_EVENTS) {
    if (known.has(eventName)) {
      console.log(`  = key event ${eventName} (deja present)`)
      continue
    }
    if (DRY_RUN) {
      console.log(`  + key event ${eventName} (a creer)`)
      continue
    }
    await client.createKeyEvent({ parent, keyEvent: { eventName, countingMethod: 'ONCE_PER_EVENT' } })
    console.log(`  + key event ${eventName} cree`)
  }
}

async function main() {
  const parent = `properties/${PROPERTY_ID}`
  console.log(`[ga-admin-setup] propriete ${parent}${DRY_RUN ? ' (dry-run)' : ''}`)
  const client = new AnalyticsAdminServiceClient()
  // Preflight : resout l'auth sur le chemin awaite -> erreur claire si ADC absent,
  // au lieu d'un rejet gax non capture lors du premier RPC.
  await client.auth.getClient()
  await syncCustomDimensions(client, parent)
  await syncKeyEvents(client, parent)
  console.log('[ga-admin-setup] termine.')
}

main().catch((err) => {
  console.error(`[ga-admin-setup] echec : ${err?.message ?? err}`)
  process.exitCode = 1
})
