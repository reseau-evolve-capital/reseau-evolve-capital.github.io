// Allowlist de notifications — mode TEST (PUSH-001).
//
// Variable d'env `NOTIFY_ALLOWLIST` = emails séparés par virgule (ex. « moi@x.com, test@y.com »).
//
// SÉMANTIQUE (sécurité) :
//   - VIDE / absente  → comportement NORMAL : on notifie tous les membres actifs du club.
//   - NON VIDE        → mode test : les Edge `send-poll-email` / `dispatch-push` ne notifient
//                       QUE les destinataires dont l'email y figure. C'est une INTERSECTION
//                       avec les membres du club — JAMAIS additif : on ne peut jamais notifier
//                       quelqu'un hors du club, ni élargir le périmètre. Au pire, on sous-notifie.
//
// Les emails sont normalisés (trim + minuscule) ; GoTrue stocke les emails en minuscule, donc
// le match est exact côté DB. À retirer (unset) le jour de la mise en production réelle.
export function parseAllowlist(raw: string | undefined | null): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)
}
