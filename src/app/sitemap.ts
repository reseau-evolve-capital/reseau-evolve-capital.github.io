import { MetadataRoute } from 'next';
import { siteConfig, locales, recClubs } from '@/config/site-config';

type ChangeFrequency = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

// Add these exports for static generation
export const dynamic = 'force-static';
export const revalidate = false;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;

  // Define your routes - both static and dynamic
  const routes = [
    '',
    '/about',
    '/clubs',
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

  return [...routeEntries, ...dynamicEntries];
} 