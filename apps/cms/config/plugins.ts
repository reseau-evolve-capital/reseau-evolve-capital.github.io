export default () => ({
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
