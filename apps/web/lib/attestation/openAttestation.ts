// RT-04 — Ouverture de l'attestation de détention (PDF) dans un nouvel onglet.
//
// Pourquoi un helper pur : la couche apps/web teste en environnement `node` (pas de jsdom/RTL
// pour les composants), on isole donc la SEULE décision « opened | blocked » ici pour la couvrir
// unitairement. Le composant appelle ce helper et n'affiche l'erreur que sur 'blocked'.
//
// Pourquoi on NE passe PAS 'noopener' :
//   `window.open(url, '_blank', 'noopener')` renvoie `null` même quand l'ouverture RÉUSSIT — un
//   contexte privé d'`opener` n'est pas retournable au code appelant. L'ancien code (commit
//   6b6ebcc, ajout de noopener pour l'ouverture synchrone iOS) interprétait donc ce `null` comme
//   « popup bloquée » → faux toast d'erreur persistant rejoué à chaque clic. En retirant
//   'noopener', le handle redevient truthy en succès et `null` ne survient QUE si l'ouverture est
//   réellement bloquée.
//
// iOS : l'ouverture reste SYNCHRONE (1re action du onClick, sans `await` préalable) — c'est ce qui
// préserve le geste utilisateur sur Safari. Retirer 'noopener' ne change rien à cette synchronicité ;
// la route GET sert déjà le PDF `inline` via le cookie d'auth, le nouvel onglet n'a pas besoin
// d'accéder à l'`opener` (aucune fuite de référence exploitable côté même origine).

/**
 * Ouvre l'URL d'attestation dans un nouvel onglet.
 * @param open  La fonction `window.open` (injectée pour testabilité).
 * @param url   L'URL GET de la route attestation (sert le PDF inline).
 * @returns `'opened'` si le handle est truthy (succès), `'blocked'` si `null` (popup bloquée).
 */
export function openAttestation(open: Window['open'], url: string): 'opened' | 'blocked' {
  const handle = open(url, '_blank')
  return handle ? 'opened' : 'blocked'
}

// --- FIX PWA iOS (standalone) ---------------------------------------------------------------
//
// Dans une PWA INSTALLÉE (display-mode: standalone), il n'existe pas de « nouvel onglet » :
// `window.open(url, '_blank')` NAVIGUE SUR PLACE vers le PDF servi `inline` par la route → le
// PDF remplit l'unique vue, sans barre d'adresse, sans bouton retour : l'utilisateur est PIÉGÉ
// (aucun moyen de revenir dans l'app ni de télécharger). Sur le web/navigateur, `_blank` ouvre
// un vrai onglet → comportement nominal conservé.
//
// On choisit donc la stratégie selon le contexte PWA : `'download'` en standalone (blob +
// `<a download>` → iOS ouvre l'aperçu Fichiers/Quick Look AVEC un bouton « OK » qui ramène dans
// l'app), `'open'` partout ailleurs (ouverture synchrone, geste utilisateur préservé).

import type { PwaCase } from '@evolve/types'

/**
 * Décision PURE (testable en env. `node`) : faut-il OUVRIR (nouvel onglet) ou TÉLÉCHARGER (blob) ?
 * Seul le mode `standalone` (PWA installée) impose le téléchargement — sinon l'utilisateur reste
 * piégé sur le PDF inline. iOS Safari hors-PWA (`ios-safari`) garde l'ouverture en onglet (OK).
 */
export function chooseAttestationStrategy(pwaCase: PwaCase): 'open' | 'download' {
  return pwaCase === 'standalone' ? 'download' : 'open'
}

/**
 * Télécharge le PDF d'attestation en blob puis déclenche un `<a download>` (cas PWA standalone).
 * Asynchrone (fetch) : réservé au standalone car le geste utilisateur n'est PAS requis pour un
 * download d'ancre (≠ popup `window.open`, bloquée si différée). `doc` injectable pour les tests.
 * @returns `'downloaded'` si le clic a été déclenché, `'error'` en cas d'échec réseau/lecture.
 */
export async function downloadAttestationBlob(
  url: string,
  filename: string,
  doc: Document = document
): Promise<'downloaded' | 'error'> {
  try {
    const res = await fetch(url, { credentials: 'same-origin' })
    if (!res.ok) return 'error'
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = doc.createElement('a')
    a.href = objectUrl
    a.download = filename
    a.rel = 'noopener'
    doc.body.appendChild(a)
    a.click()
    a.remove()
    // Révocation différée : laisse iOS lire le blob avant de libérer l'URL objet.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
    return 'downloaded'
  } catch {
    return 'error'
  }
}
