import { Metadata } from 'next';
import { getAllArticles, getAllCategories } from '@/lib/api';
import BlogCard from '@/components/blog/BlogCard';
import CategoryList from '@/components/blog/CategoryList';
import { locales } from '@/config/site-config';

interface BlogPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export const revalidate = 3600; // Revalidate at most once per hour

export async function generateStaticParams() {
  return locales.map((locale) => ({
    locale,
  }));
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { locale } = await params;
  
  const title = locale === 'en' 
    ? 'Blog - Reseau Evolve Capital' 
    : 'Blog - Reseau Evolve Capital';
  
  const description = locale === 'en'
    ? 'Latest articles and insights from Reseau Evolve Capital'
    : 'Derniers articles et analyses de Reseau Evolve Capital';
  
  return {
    title,
    description,
    alternates: {
      canonical: `/blog`,
      languages: {
        'fr': `/fr/blog`,
        'en': `/en/blog`,
      },
    },
  };
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { locale } = await params;
  
  // Fetch articles and categories
  const articles = await getAllArticles(locale);
  const categories = await getAllCategories(locale);
  
  // Translations
  const translations = {
    title: locale === 'en' ? 'Blog' : 'Blog',
    subtitle: locale === 'en' 
      ? 'Latest articles and insights from Reseau Evolve Capital' 
      : 'Derniers articles et analyses de Reseau Evolve Capital',
    noArticles: locale === 'en' 
      ? 'No articles available at the moment. Please check back soon.' 
      : 'Aucun article disponible pour le moment. Revenez bientôt.',
  };
  
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">{translations.title}</h1>
        <p className="mx-auto max-w-2xl text-xl text-gray-700">{translations.subtitle}</p>
      </div>
      
      {/* Category list */}
      <CategoryList categories={categories} locale={locale} />
      
      {/* Articles grid */}
      {articles.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <BlogCard key={article.id} article={article} locale={locale} />
          ))}
        </div>
      ) : (
        <div className="my-16 text-center text-lg text-gray-600">
          {translations.noArticles}
        </div>
      )}
    </div>
  );
} 