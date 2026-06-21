import { Skeleton } from '@evolve/ui'

// Skeleton du chargement RSC de /reseau/newsletter (en-tête + sélecteur + aperçu + 2 étapes).
// Pas de wrapper largeur/padding : les layouts (app) + /reseau fournissent déjà le centrage.
export default function ReseauNewsletterLoading() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton height={32} width="30%" radius="8px" />
      <Skeleton height={44} radius="8px" />
      <Skeleton height={640} radius="14px" />
      <Skeleton height={120} radius="10px" />
      <Skeleton height={140} radius="10px" />
    </div>
  )
}
