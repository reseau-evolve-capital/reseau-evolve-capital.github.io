import { redirect } from 'next/navigation'

// NET-A : l'entrée du scope RÉSEAU redirige vers la première vue « Clubs » (NET-005).
// Tant que /reseau/clubs n'est pas livré, c'est un 404 transitoire assumé — pas de
// placeholder jetable. La garde d'accès est portée par le layout (Forbidden) + middleware.
export default function ReseauPage() {
  redirect('/reseau/clubs')
}
