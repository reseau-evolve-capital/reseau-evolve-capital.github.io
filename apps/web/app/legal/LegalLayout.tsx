// Coquille présentationnelle des pages légales (BUG 3 — charte / confidentialité).
//
// Pages PUBLIQUES, self-contained dans apps/web (le contenu légal de la vitrine vit sur
// un autre déploiement GitHub Pages → inaccessible depuis l'app membre). Lues pendant
// l'onboarding, donc aucune authentification requise (cf. middleware : /legal n'est pas un
// préfixe protégé).
//
// Brandée et thémée clair/sombre via tokens uniquement (zéro hex). Sémantique a11y :
// <main> landmark, <h1> unique + <h2> par section, lien de retour focusable.

import type { ReactNode } from 'react'

import { Logo, Link } from '@evolve/ui'

const LOGO_SRC = '/logo.jpg'

/** Une section de contenu légal : un titre (h2) + une liste de paragraphes. */
export interface LegalSection {
  title: string
  paragraphs: readonly string[]
}

export interface LegalLayoutProps {
  /** Titre principal de la page (h1). */
  title: string
  /** Libellé « Dernière mise à jour ». */
  updatedLabel: string
  /** Date de mise à jour déjà formatée (locale active). */
  updatedDate: string
  /** Sections du document. */
  sections: readonly LegalSection[]
  /** Libellé du lien de retour. */
  backLabel: string
  /** Cible du lien de retour (interne). */
  backHref: string
  /** Bloc optionnel rendu sous le titre (ex. lien vers l'autre page légale). */
  intro?: ReactNode
}

export function LegalLayout({
  title,
  updatedLabel,
  updatedDate,
  sections,
  backLabel,
  backHref,
  intro,
}: LegalLayoutProps) {
  return (
    <main className="flex min-h-dvh justify-center bg-bg px-4 py-12">
      <article className="w-full max-w-2xl">
        <Logo variant="full" src={LOGO_SRC} className="mb-8" />

        <header className="mb-8 flex flex-col gap-2">
          <h1 className="font-display text-[28px] font-bold leading-tight text-text sm:text-[34px]">
            {title}
          </h1>
          <p className="text-[13px] text-text-sec">
            {updatedLabel} {updatedDate}
          </p>
          {intro ? <div className="text-[15px] leading-relaxed text-text-sec">{intro}</div> : null}
        </header>

        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <section key={section.title} className="flex flex-col gap-2">
              <h2 className="font-display text-[19px] font-semibold leading-snug text-text sm:text-[21px]">
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className="text-[15px] leading-relaxed text-text-sec [overflow-wrap:anywhere]"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <footer className="mt-12 border-t border-border pt-6">
          <Link href={backHref} className="text-[14px]">
            {backLabel}
          </Link>
        </footer>
      </article>
    </main>
  )
}
