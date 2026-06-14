// Constantes de marque servies par l'app membre.

/**
 * Logo de marque (image) — version CLAIRE : la tuile crème (#F4F4F2, artwork centré)
 * de l'icône PWA 192px.
 *
 * SOURCE UNIQUE : toutes les surfaces qui affichent le logo via l'atome `Logo`
 * (login, onboarding, pages légales, vérification d'attestation, chrome app
 * sidebar/topbar) DOIVENT importer cette constante au lieu de coder le chemin en dur.
 *
 * Incident (juin 2026) : la migration vers le logo clair n'avait touché QUE le chrome
 * authentifié + les assets PWA. Quatre surfaces (login, onboarding, légal, vérif)
 * pointaient encore l'ancien logo à fond noir. Comme la PWA démarre sur
 * `/dashboard` (chrome clair) mais que l'entrée navigateur est `/login`, l'utilisateur
 * voyait « PWA claire / navigateur ancien ». Une constante unique élimine cette dérive ;
 * la garde `apps/web/lib/brand.test.ts` interdit toute réintroduction de l'ancien chemin.
 */
export const BRAND_LOGO_SRC = '/icons/icon-192.png'
