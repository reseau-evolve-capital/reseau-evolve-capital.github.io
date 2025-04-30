import { Metadata } from 'next';
import { getAllCategories, getArticlesByCategory } from '@/lib/api';
import BlogCard from '@/components/blog/BlogCard';
import CategoryList from '@/components/blog/CategoryList';

interface CategoryPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

export const revalidate = 3600; // Revalidate at most once per hour

export async function generateStaticParams() {
  // Get all categories for all locales for static generation
  const frCategories = await getAllCategories('fr');
  const enCategories = await getAllCategories('en');
  
  const params = [];
  
  // Create params for French categories
  for (const category of frCategories) {
    params.push({
      locale: 'fr',
      id: category.id.toString(),
    });
  }
  
  // Create params for English categories
  for (const category of enCategories) {
    params.push({
      locale: 'en',
      id: category.id.toString(),
    });
  }
  
  return params;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const categoryId = parseInt(id, 10);
  
  // Get all categories to find the current one
  const categories = await getAllCategories(locale);
  const category = categories.find(cat => cat.id === categoryId);
  
  if (!category) {
    return {
      title: 'Category not found',
    };
  }
  
  const categoryName = category.name;
  
  const title = locale === 'en' 
    ? `${categoryName} - Blog - Reseau Evolve Capital` 
    : `${categoryName} - Blog - Reseau Evolve Capital`;
  
  const description = locale === 'en'
    ? `Articles about ${categoryName} from Reseau Evolve Capital`
    : `Articles sur ${categoryName} de Reseau Evolve Capital`;
  
  return {
    title,
    description,
    alternates: {
      canonical: `/blog/category/${id}`,
      languages: {
        'fr': `/fr/blog/category/${id}`,
        'en': `/en/blog/category/${id}`,
      },
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { locale, id } = await params;
  const categoryId = parseInt(id, 10);
  
  // Fetch articles for this category and all categories
  const categories = await getAllCategories(locale);
  const articles = await getArticlesByCategory(categoryId, locale);
  
  // Find the current category
  const category = categories.find(cat => cat.id === categoryId);
  
  if (!category) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">
          {locale === 'en' ? 'Category Not Found' : 'Catégorie non trouvée'}
        </h1>
        <p className="text-lg text-gray-700">
          {locale === 'en' 
            ? 'The category you are looking for does not exist.' 
            : 'La catégorie que vous recherchez n\'existe pas.'}
        </p>
      </div>
    );
  }
  
  const categoryName = category.name;
  
  // Translations
  const translations = {
    categoryArticles: locale === 'en' 
      ? `Articles in category "${categoryName}"` 
      : `Articles dans la catégorie "${categoryName}"`,
    noArticles: locale === 'en' 
      ? `No articles available in the "${categoryName}" category yet.` 
      : `Aucun article disponible dans la catégorie "${categoryName}" pour le moment.`,
  };
  
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">{translations.categoryArticles}</h1>
      </div>
      
      {/* Category list */}
      <CategoryList categories={categories} locale={locale} activeCategory={categoryId} />
      
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