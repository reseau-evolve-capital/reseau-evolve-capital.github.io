import { describe, expect, it } from 'vitest'
import { buildDeployMessage } from './discord-notify.mjs'

const base = { runUrl: 'https://github.com/x/actions/runs/1', siteUrl: 'https://reseauevolvecapital.com', commitMessage: 'feat: x' }

describe('buildDeployMessage', () => {
  it('succès déclenché par le code', () => {
    const m = buildDeployMessage({ ...base, outcome: 'success', trigger: 'push', articles: [] })
    expect(m.embeds[0]).toMatchObject({ title: 'Site vitrine déployé', color: 3066993 })
    expect(JSON.stringify(m)).toContain('Code')
    expect(JSON.stringify(m)).toContain('feat: x')
  })
  it('succès déclenché par Strapi, avec articles', () => {
    const m = buildDeployMessage({ ...base, outcome: 'success', trigger: 'repository_dispatch', articles: [{ title: 'A1', slug: 'a1' }, { title: 'A2', slug: 'a2' }] })
    const json = JSON.stringify(m)
    expect(json).toContain('Contenu')
    expect(json).toContain('https://reseauevolvecapital.com/fr/blog/a1/')
    expect(json).toContain('A2')
  })
  it('échec : embed rouge avec lien vers le run', () => {
    const m = buildDeployMessage({ ...base, outcome: 'failure', trigger: 'repository_dispatch', articles: [] })
    expect(m.embeds[0]).toMatchObject({ title: 'Échec du déploiement de la vitrine', color: 15158332, url: base.runUrl })
    expect(JSON.stringify(m)).toContain('site précédent reste en ligne')
  })
})
