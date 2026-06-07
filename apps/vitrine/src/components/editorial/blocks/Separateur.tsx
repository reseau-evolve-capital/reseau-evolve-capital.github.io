import type { SeparateurBloc } from '@/lib/api'

/**
 * Séparateur. `filet` → trait horizontal discret ; `espace` → espacement
 * vertical seul (aucun trait). Décoratif → masqué aux lecteurs d'écran.
 */
export default function Separateur({ block }: { block: SeparateurBloc }) {
  if (block.style === 'espace') {
    return <div aria-hidden="true" className="h-8" />
  }
  return <hr aria-hidden="true" className="my-8 border-t border-gray-200" />
}
