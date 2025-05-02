import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllArticles, getArticleBySlug, getStrapiMediaUrl, getArticleOfLocaleAndDocumentId } from '@/lib/api';
import BlogArticleContent from '@/components/blog/BlogArticleContent';
import RelatedArticles from '@/components/blog/RelatedArticles';

interface ArticlePageProps {
  params: Promise<{
    locale: string;
    slug: string;
    documentId: string;
  }>;
}

export const revalidate = 3600; // Revalidate at most once per hour

export async function generateStaticParams() {
  // Get all articles for all locales for static generation
  const frArticles = await getAllArticles('fr');
  const enArticles = await getAllArticles('en');
  const params = [];
  
  // Create params for French articles
  for (const article of frArticles) {
    params.push({
      locale: 'fr',
      slug: article.slug,
      documentId: article.documentId,
    });
  }
  
  // Create params for English articles
  for (const article of enArticles) {
    params.push({
      locale: 'en',
      slug: article.slug,
      documentId: article.documentId,
    });
  }
  
  return params;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { locale, slug, documentId } = await params;
  
  const article = await getArticleBySlug(slug, locale);
  
  if (!article) {
    return {
      title: 'Article not found',
    };
  }
  const alternateArticle = await getArticleOfLocaleAndDocumentId(documentId, locale === 'fr' ? 'en' : 'fr');

  const alternates = {
    canonical: `/blog/${slug}`,
    languages: {
      'fr': `/fr/blog/${locale === 'fr' ? slug : alternateArticle?.slug || ''}`,
      'en': `/en/blog/${locale === 'en' ? slug : alternateArticle?.slug || ''}`,
    },
  };
  
  return {
    title: article.SEOMetaTitle || article.title,
    description: article.SEOMetaDescription || article.excerpt,
    openGraph: {
      images: [getStrapiMediaUrl(article.featuredImage)],
    },
    alternates,
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { locale, slug } = await params;
  
  const article = await getArticleBySlug(slug, locale);
  
  if (!article) {
    notFound();
  }
  
  // Translations
  const translations = {
    publishedOn: locale === 'en' ? 'Published on' : 'Publié le',
    category: locale === 'en' ? 'Category' : 'Catégorie',
    author: locale === 'en' ? 'Author' : 'Auteur',
    backToList: locale === 'en' ? 'Back to blog' : 'Retour au blog',
  };
  
  return (
    <article className="container mx-auto px-4 py-16">
      {/* Article Content */}
      <BlogArticleContent 
        article={article}
        locale={locale}
        translations={translations}
      />
      
      {/* Related Articles */}
      <div className="mx-auto max-w-6xl">
        <RelatedArticles 
          currentArticle={article}
          locale={locale}
          maxArticles={3}
        />
      </div>
    </article>
  );
} 