// Libellés de démo (FR) pour les stories / tests de SheetConnectionTest. Le composant lui-même
// est ZÉRO-i18n : l'app injecte ces libellés depuis next-intl (reseau.addClub.matrix.*).
import type { SheetConnectionTestLabels } from './SheetConnectionTest'

export const DEMO_LABELS: SheetConnectionTestLabels = {
  fieldLabel: 'URL ou ID de la feuille Google Sheets',
  fieldHint: "Colle l'URL complète — l'identifiant est extrait automatiquement.",
  placeholder: 'https://docs.google.com/spreadsheets/d/…/edit',
  shareTitle: "Partage d'abord cette feuille en lecture avec :",
  shareHint: 'Dans Google Sheets : Partager → colle l’adresse → rôle Lecteur → Envoyer.',
  copyEmail: 'Copier',
  copied: 'Copié',
  testConnection: 'Tester la connexion',
  testing: 'Test en cours…',
  successTitle: 'Connexion réussie',
  successPreview: (p) =>
    `Aperçu : ${p.members} membres · ${p.positions} positions · ${p.tabsFound} onglets détectés.`,
  dryRunBadge: 'Dry-run · lecture seule · aucune écriture',
  notSharedTitle: 'Feuille non partagée',
  notSharedBody: (sa) =>
    sa
      ? `Partage la feuille en lecture avec ${sa}, puis relance le test.`
      : 'Partage la feuille en lecture avec le compte de service, puis relance le test.',
  structureTitle: 'Structure incomplète',
  structureBody: (tabs) =>
    `La feuille est accessible mais des onglets attendus manquent : ${tabs.join(', ')}.`,
  invalidTitle: 'Feuille introuvable',
  invalidBody: "L'URL ou l'identifiant ne correspond à aucune feuille Google Sheets.",
  errorTitle: 'Test impossible',
  errorBody: 'Une erreur est survenue pendant le test. Réessaie dans un instant.',
}
