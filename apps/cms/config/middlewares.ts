export default ({ env }) => {
  // Storage Supabase obsolète (provider d'upload = local). On garde la variable optionnelle
  // pour rétro-compat, mais on la RETIRE des directives CSP si absente : sinon `undefined`
  // se glisse dans le tableau → en-tête Content-Security-Policy cassé en prod.
  const supabaseUrl = env('SUPABASE_URL')

  return [
    'strapi::logger',
    'strapi::errors',
    {
      name: 'strapi::security',
      config: {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            'connect-src': ["'self'", 'https:'],
            'default-src': ["'self'"],
            'img-src': ["'self'", 'data:', 'blob:', 'market-assets.strapi.io', supabaseUrl].filter(
              Boolean
            ),
            'media-src': [
              "'self'",
              'data:',
              'blob:',
              'market-assets.strapi.io',
              supabaseUrl,
            ].filter(Boolean),
          },
        },
      },
    },
    {
      name: 'strapi::cors',
      config: {
        // Origines autorisées, scopées au domaine vitrine en prod. La vitrine fetch surtout
        // au BUILD (server-side, hors navigateur) → CORS peu critique, mais scopé par hygiène.
        // Défaut local : ports dev de apps/web (3001) et autres (3000).
        origin: env.array('CMS_CORS_ORIGINS', ['http://localhost:3000', 'http://localhost:3001']),
      },
    },
    'strapi::poweredBy',
    'strapi::query',
    'strapi::body',
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ]
}
