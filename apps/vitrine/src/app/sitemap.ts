import { MetadataRoute } from 'next';
import { siteConfig, locales, recClubs } from '@/config/site-config';
import { getAllArticles, getAllCategories } from '@/lib/api';

type ChangeFrequency = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

// Add these exports for static generation
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate the sitemap once per hour to pick up new blog content

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;

  // Define your static routes
  const routes = [
    '',
    '/about',
    '/clubs',
    '/blog', // Add main blog page
    //'/events',
    //'/resources',
    '/contact',
    //'/join',
    //'/partnerships'
  ];

  // Create sitemap entries for each locale and route combination
  const routeEntries: MetadataRoute.Sitemap = routes.flatMap((route) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: (route === '' ? 'daily' : 'weekly') as ChangeFrequency,
      priority: route === '' ? 1 : 0.8,
      // Add language alternates for each URL
      alternates: {
        languages: {
          'fr': `${baseUrl}/fr${route}`,
          'en': `${baseUrl}/en${route}`,
        },
      },
    }))
  );

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

  // Add dynamic routes for clubs, events, and resources
  // You would typically fetch these from your data source
  const dynamicEntries: MetadataRoute.Sitemap = [
    // Example for clubs
    ...recClubs.map((club) => ({
      url: `${baseUrl}/fr/clubs/${club.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as ChangeFrequency,
      priority: 0.7,
      alternates: {
        languages: {
          'fr': `${baseUrl}/fr/clubs/${club.id}`,
          'en': `${baseUrl}/en/clubs/${club.id}`,
        },
      },
    })),
    // Example for events
    // ...siteConfig.pageContent.home.events.events.map((event) => ({
    //   url: `${baseUrl}/fr/events/${event.id}`,
    //   lastModified: new Date(),
    //   changeFrequency: 'daily' as const,
    //   priority: 0.9,
    //   alternates: {
    //     languages: {
    //       'fr': `${baseUrl}/fr/events/${event.id}`,
    //       'en': `${baseUrl}/en/events/${event.id}`,
    //     },
    //   },
    // })),
    // Example for resources
    // ...siteConfig.pageContent.home.mediaResources.resources.map((resource) => ({
    //   url: `${baseUrl}/fr/resources/${resource.type}/${resource.id}`,
    //   lastModified: new Date(),
    //   changeFrequency: 'monthly' as const,
    //   priority: 0.6,
    //   alternates: {
    //     languages: {
    //       'fr': `${baseUrl}/fr/resources/${resource.type}/${resource.id}`,
    //       'en': `${baseUrl}/en/resources/${resource.type}/${resource.id}`,
    //     },
    //   },
    // })),
  ];

  return [...routeEntries, ...blogArticleEntries, ...blogCategoryEntries, ...dynamicEntries];
} 