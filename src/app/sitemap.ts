import { MetadataRoute } from 'next';
import { SITE_URL, locales } from '@/lib/site';
import { loadSiteContent } from '@/lib/site-content';
import { getAllArticles, getAllCategories } from '@/lib/api';

type ChangeFrequency = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

// Add these exports for static generation
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate the sitemap once per hour to pick up new blog content

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const { pages, clubs } = await loadSiteContent();

  const pageUrl = (locale: string, slug: string) => `${baseUrl}/${locale}${slug === 'index' ? '' : `/${slug}`}`;
  // Les pages legales n'ont jamais figure au sitemap : parite conservee
  const slugs = [...new Set([...pages.fr, ...pages.en].map((p) => p.slug))].filter((s) => !s.startsWith('legal/'));

  // Pages Strapi (une entree par locale ou la page existe) + liste du blog
  const routeEntries: MetadataRoute.Sitemap = [...slugs, 'blog'].flatMap((slug) => {
    const existing = slug === 'blog' ? locales : locales.filter((l) => pages[l].some((p) => p.slug === slug));
    const isHome = slug === 'index';
    return existing.map((locale) => {
      const updatedAt = pages[locale].find((p) => p.slug === slug)?.updatedAt;
      return {
        url: pageUrl(locale, slug),
        lastModified: updatedAt ? new Date(updatedAt) : new Date(),
        changeFrequency: (isHome ? 'daily' : 'weekly') as ChangeFrequency,
        priority: isHome ? 1 : 0.8,
        alternates: {
          languages: Object.fromEntries(existing.map((l) => [l, pageUrl(l, slug)])),
        },
      };
    });
  });

  // Fetch blog articles for each locale
  const frArticles = await getAllArticles('fr');
  const enArticles = await getAllArticles('en');
  
  // Fetch blog categories for each locale
  const frCategories = await getAllCategories('fr');
  const enCategories = await getAllCategories('en');
  
  // Create sitemap entries for blog articles
  const blogArticleEntries: MetadataRoute.Sitemap = [
    // French articles
    ...frArticles.map((article) => {
      // Find the corresponding English article if it exists (by documentId)
      const enArticle = article.documentId 
        ? enArticles.find(enArt => enArt.documentId === article.documentId)
        : null;
        
      return {
        url: `${baseUrl}/fr/blog/${article.slug}`,
        lastModified: new Date(article.updatedAt),
        changeFrequency: 'weekly' as ChangeFrequency,
        priority: 0.7,
        alternates: {
          languages: {
            'fr': `${baseUrl}/fr/blog/${article.slug}`,
            'en': enArticle ? `${baseUrl}/en/blog/${enArticle.slug}` : undefined,
          },
        },
      };
    }),
    
    // English articles (only include those not already represented by their French version)
    ...enArticles
      .filter(enArticle => 
        !enArticle.documentId || 
        !frArticles.some(frArt => frArt.documentId === enArticle.documentId)
      )
      .map((article) => {
        // Find the corresponding French article if it exists (by documentId)
        const frArticle = article.documentId 
          ? frArticles.find(frArt => frArt.documentId === article.documentId)
          : null;
          
        return {
          url: `${baseUrl}/en/blog/${article.slug}`,
          lastModified: new Date(article.updatedAt),
          changeFrequency: 'weekly' as ChangeFrequency,
          priority: 0.7,
          alternates: {
            languages: {
              'en': `${baseUrl}/en/blog/${article.slug}`,
              'fr': frArticle ? `${baseUrl}/fr/blog/${frArticle.slug}` : undefined,
            },
          },
        };
      }),
  ];
  
  // Create sitemap entries for blog categories
  const blogCategoryEntries: MetadataRoute.Sitemap = [
    // French categories
    ...frCategories.map((category) => {
      // Find the corresponding English category if it exists (by id)
      const enCategory = enCategories.find(enCat => enCat.id === category.id);
      
      return {
        url: `${baseUrl}/fr/blog/category/${category.id}`,
        lastModified: new Date(category.updatedAt),
        changeFrequency: 'weekly' as ChangeFrequency,
        priority: 0.6,
        alternates: {
          languages: {
            'fr': `${baseUrl}/fr/blog/category/${category.id}`,
            'en': enCategory ? `${baseUrl}/en/blog/category/${category.id}` : undefined,
          },
        },
      };
    }),
    
    // English categories (only include those not already represented by their French version)
    ...enCategories
      .filter(enCategory => !frCategories.some(frCat => frCat.id === enCategory.id))
      .map((category) => ({
        url: `${baseUrl}/en/blog/category/${category.id}`,
        lastModified: new Date(category.updatedAt),
        changeFrequency: 'weekly' as ChangeFrequency,
        priority: 0.6,
        alternates: {
          languages: {
            'en': `${baseUrl}/en/blog/category/${category.id}`,
            'fr': undefined,
          },
        },
      })),
  ];

  // Clubs : union des slugs fr/en, une entree par club (URL de la premiere langue ou il existe),
  // alternates limitees aux langues ou il existe.
  const clubSlugs = [...new Set([...clubs.fr, ...clubs.en].map((c) => c.slug))];
  const clubEntries: MetadataRoute.Sitemap = clubSlugs.map((slug) => {
    const existing = locales.filter((l) => clubs[l].some((c) => c.slug === slug));
    return {
      url: `${baseUrl}/${existing[0]}/clubs/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as ChangeFrequency,
      priority: 0.7,
      alternates: {
        languages: Object.fromEntries(existing.map((l) => [l, `${baseUrl}/${l}/clubs/${slug}`])),
      },
    };
  });

  return [...routeEntries, ...blogArticleEntries, ...blogCategoryEntries, ...clubEntries];
} 