export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  // URL publique (prod : https://strapi.reseauevolvecapital.com, TLS terminé par Traefik).
  // Absente en local → Strapi déduit l'URL de la requête. Sert aux liens absolus de
  // l'admin ET aux URLs de médias (provider local → https://.../uploads/...).
  url: env('URL', undefined),
  // Derrière Traefik : faire confiance aux en-têtes X-Forwarded-* (proto/host) pour
  // générer des liens HTTPS corrects. false en local (pas de proxy).
  proxy: env.bool('IS_PROXIED', false),
  app: {
    keys: env.array('APP_KEYS'),
  },
})
