// Mappe un code d'erreur métier (renvoyé par les Server Actions) vers une clé i18n LITTÉRALE
// du namespace `admin.operations.errors`. Le typage strict de next-intl interdit les clés
// dynamiques ; ce switch garantit qu'on ne passe que des clés connues (fallback 'unknown').

export type OperationErrorKey = 'forbidden' | 'invalid' | 'unauthorized' | 'unknown'

export function errorMessageKey(code: string): OperationErrorKey {
  switch (code) {
    case 'forbidden':
      return 'forbidden'
    case 'invalid':
      return 'invalid'
    case 'unauthorized':
      return 'unauthorized'
    default:
      return 'unknown'
  }
}
