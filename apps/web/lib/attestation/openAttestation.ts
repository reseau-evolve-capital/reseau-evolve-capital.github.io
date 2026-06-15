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
