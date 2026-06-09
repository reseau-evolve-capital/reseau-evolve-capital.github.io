export default () => ({
  // Traduction auto FR→EN du blog (EDI-008). Le plugin est auto-découvert par Strapi 5 ;
  // l'entrée explicite documente sa présence. Config réelle = variables d'env
  // (LLM_TRANSLATOR_LLM_API_KEY + STRAPI_ADMIN_LLM_TRANSLATOR_*) + System prompt réglé dans
  // la page de config du plugin (admin, stocké en DB). Cf. apps/cms/CLAUDE.md « Traduction FR→EN ».
  'strapi-llm-translator': {
    enabled: true,
  },
  // Provider d'upload LOCAL (disque) — l'ancien storage Supabase (bucket rec.blog.assets) est mort.
  // Les nouveaux uploads vont dans apps/cms/public/uploads.
  // ⚠ PROD : le site vitrine est en export statique → les images doivent être servies depuis un
  // storage PUBLIC. Le provider local ne suffit PAS en prod (URLs localhost:1337). Pour déployer le
  // blog avec images, recâbler strapi-provider-upload-supabase sur un NOUVEAU projet Supabase (ou S3/
  // Cloudinary) et re-uploader. Voir apps/cms/CLAUDE.md.
  upload: {
    config: {
      provider: 'local',
      sizeLimit: 250 * 1024 * 1024, // 250 Mo
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
})
