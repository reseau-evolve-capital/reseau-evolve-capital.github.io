import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Evolve Capital',
  description: "Plateforme d'investissement participatif",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
