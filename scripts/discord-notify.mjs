// Notification Discord de fin de déploiement. Ne fait jamais échouer le workflow.
import { pathToFileURL } from 'node:url'

export function buildDeployMessage({ outcome, trigger, commitMessage, runUrl, siteUrl, articles }) {
  if (outcome !== 'success') {
    return {
      embeds: [{
        title: 'Échec du déploiement de la vitrine', url: runUrl, color: 15158332,
        description: 'Le site précédent reste en ligne. Voir le run pour le détail.',
      }],
    }
  }
  const fields = [
    { name: 'Origine', value: trigger === 'repository_dispatch' ? 'Contenu (Strapi)' : 'Code', inline: true },
    { name: 'Site', value: siteUrl, inline: true },
  ]
  if (trigger !== 'repository_dispatch' && commitMessage) fields.push({ name: 'Commit', value: commitMessage.slice(0, 200), inline: false })
  if (articles.length) {
    fields.push({
      name: 'Articles publiés ou mis à jour',
      value: articles.map((a) => `[${a.title}](${siteUrl}/fr/blog/${a.slug}/)`).join('\n').slice(0, 1024),
      inline: false,
    })
  }
  return { embeds: [{ title: 'Site vitrine déployé', url: siteUrl, color: 3066993, fields }] }
}

async function main() {
  const { DISCORD_WEBHOOK_URL, OUTCOME, TRIGGER, COMMIT_MESSAGE, RUN_URL, SITE_URL, STRAPI_API_URL, SINCE } = process.env
  if (!DISCORD_WEBHOOK_URL) return console.log('DISCORD_WEBHOOK_URL absent : notification ignorée')
  let articles = []
  if (OUTCOME === 'success' && SINCE) {
    try {
      const url = `${STRAPI_API_URL}/articles?locale=fr&fields[0]=title&fields[1]=slug&sort[0]=publishedAt:asc&pagination[pageSize]=20&filters[publishedAt][$gt]=${encodeURIComponent(SINCE)}`
      articles = (await (await fetch(url)).json()).data ?? []
    } catch (err) {
      console.warn(`Articles non récupérés : ${err.message}`)
    }
  }
  const body = buildDeployMessage({ outcome: OUTCOME, trigger: TRIGGER, commitMessage: COMMIT_MESSAGE, runUrl: RUN_URL, siteUrl: SITE_URL, articles })
  const res = await fetch(DISCORD_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) console.warn(`Discord a répondu ${res.status}`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => console.warn(`Notification Discord en échec : ${err.message}`))
}
