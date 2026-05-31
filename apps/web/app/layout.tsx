import type { Metadata } from 'next'
import '@evolve/design-system/styles/index.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Evolve Capital',
  description: "Plateforme d'investissement participatif",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="ec-scope">
      <body>{children}</body>
    </html>
  )
}
