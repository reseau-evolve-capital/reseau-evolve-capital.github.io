import Link from 'next/link'
import { Article, getStrapiMediaUrl } from '@/lib/api'
import BlockRenderer from '@/components/editorial/BlockRenderer'
import { estimateReadingTime } from '@/components/editorial/readingTime'
import { formatDate } from '@/lib/utils'
import SocialShareButtons from '@/components/blog/SocialShareButtons'
import AuthorBio from '@/components/blog/AuthorBio'

interface EditorialArticleContentProps {
  article: Article
  locale: string
}

/**
 * Rendu d'un article/newsletter éditorial (`corps`) : hero (badge édition, titre,
 * auteur, date, temps de lecture) → blocs → pied auteur + CTA réseau discret.
 * La page bascule sur ce composant quand `article.corps?.length` est non vide ;
 * sinon elle retombe sur le rendu legacy `BlogArticleContent`.
 */
export default function EditorialArticleContent({ article, locale }: EditorialArticleContentProps) {
  const isNewsletter = article.type === 'newsletter'
  const dateSource = article.datePublication || article.publishedAt
  const coverUrl = getStrapiMediaUrl(article.featuredImage)
  const readingMin = estimateReadingTime(article.corps)

  const t = {
    backToList: locale === 'en' ? 'Back to blog' : 'Retour au blog',
    edition: locale === 'en' ? 'The Quote-Part' : 'La Quote-Part',
    readingTime: locale === 'en' ? `${readingMin} min read` : `${readingMin} min de lecture`,
    by: locale === 'en' ? 'By' : 'Par',
  }

  return (
    <>
      {/* Back link */}
      <div className="mb-8">
        <Link
          href={`/${locale}/blog`}
          className="inline-flex items-center text-gray-600 transition-colors hover:text-[#231F20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#231F20]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mr-2 h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          {t.backToList}
        </Link>
      </div>

      {/* Hero */}
      <header className="mx-auto mb-10 max-w-3xl">
        {isNewsletter && article.numeroEdition ? (
          <p
            className="mb-4 inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#231F20]"
            data-testid="editorial-edition-badge"
          >
            <span aria-hidden="true" className="inline-block h-3 w-3 bg-[#FDC70C]" />
            {t.edition} n°{article.numeroEdition}
          </p>
        ) : null}

        <h1 className="mb-5 text-4xl font-bold leading-tight text-[#231F20]">{article.title}</h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
          {article.auteurNom ? (
            <span>
              {t.by} <span className="font-medium text-gray-800">{article.auteurNom}</span>
              {article.auteurRole ? (
                <span className="text-gray-500"> · {article.auteurRole}</span>
              ) : null}
            </span>
          ) : null}
          {dateSource ? (
            <span>
              <span aria-hidden="true" className="mr-4 text-gray-300">
                |
              </span>
              {formatDate(dateSource, locale)}
            </span>
          ) : null}
          <span>
            <span aria-hidden="true" className="mr-4 text-gray-300">
              |
            </span>
            {t.readingTime}
          </span>
        </div>
      </header>

      {/* Featured image */}
      {coverUrl ? (
        <figure className="mx-auto mb-10 max-w-4xl overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt={article.featuredImage?.alternativeText || article.title}
            className="h-auto w-full"
          />
        </figure>
      ) : null}

      {/* Corps éditorial */}
      <div className="prose prose-lg mx-auto max-w-3xl">
        <BlockRenderer corps={article.corps} locale={locale} />
      </div>

      {/* Pied : partage + à propos de l'auteur */}
      <div className="mx-auto max-w-3xl">
        {/* Partage (SEO / diffusion réseaux) */}
        <SocialShareButtons
          url={`/${locale}/blog/${article.slug}`}
          title={article.title}
          locale={locale}
        />

        {/* À propos de l'auteur : fiche riche si relation `author`, sinon signature simple */}
        {article.author ? (
          <AuthorBio author={article.author} locale={locale} />
        ) : article.auteurNom ? (
          <div className="mt-12 border-t border-gray-200 pt-8">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-[#231F20]">{article.auteurNom}</span>
              {article.auteurRole ? (
                <span className="text-gray-500"> — {article.auteurRole}</span>
              ) : null}
            </p>
          </div>
        ) : null}
      </div>
    </>
  )
}
