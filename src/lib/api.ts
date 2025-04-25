import strapiClient from './strapi';



// Base type for all Strapi documents
export interface StrapiDocumentBase {
  id: number;
  documentId?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// This is the actual document structure we get from Strapi client
export type StrapiDocument<T> = T & StrapiDocumentBase;

// Strapi block content types from @strapi/blocks-react-renderer
export interface StrapiBlocksContent {
  type: 'root';
  children: unknown[];
  [key: string]: unknown;
}

export interface ArticleFields {
  title: string;
  slug: string;
  excerpt: string;
  content: StrapiBlocksContent;
  featuredImage: StrapiMedia;
  SEOMetaTitle: string;
  SEOMetaDescription: string;
  category: CategoryFields & StrapiDocumentBase | null;
  tags: (TagFields & StrapiDocumentBase)[] | null;
  author: AuthorFields & StrapiDocumentBase | null;
  locale: string;
}

export type Article = StrapiDocument<ArticleFields>;

export interface CategoryFields {
  name: string;
  description: string | null;
  articles?: (ArticleFields & StrapiDocumentBase)[] | null;
  locale: string;
}

export type Category = StrapiDocument<CategoryFields>;

export interface SocialMediaLink {
  platform: string;
  url: string;
  icon?: string;
}

export interface AuthorFields {
  name: string;
  bio: StrapiBlocksContent;
  avatar: StrapiMedia;
  socialMediaLinks: SocialMediaLink[];
}

export type Author = StrapiDocument<AuthorFields>;

export interface TagFields {
  name: string;
  articles?: (ArticleFields & StrapiDocumentBase)[] | null;
}

export type Tag = StrapiDocument<TagFields>;

export interface StrapiMedia {
  
    id: number;
    
      name: string;
      alternativeText: string;
      caption: string;
      width: number;
      height: number;
      formats: {
        thumbnail: StrapiMediaFormat;
        small: StrapiMediaFormat;
        medium: StrapiMediaFormat;
        large: StrapiMediaFormat;
      };
      hash: string;
      ext: string;
      mime: string;
      size: number;
      url: string;
      previewUrl: string | null;
      provider: string;
      provider_metadata: null;
      createdAt: string;
      updatedAt: string;
    
}

export interface StrapiMediaFormat {
  name: string;
  hash: string;
  ext: string;
  mime: string;
  path: string | null;
  width: number;
  height: number;
  size: number;
  url: string;
}

// API functions to fetch data from Strapi
export async function getAllArticles(locale: string): Promise<Article[]> {
  try {
    const articles = strapiClient.collection('articles');
    const response = await articles.find({
      locale,
      populate: ['featuredImage', 'category', 'author', 'author.avatar', 'tags'],
      sort: ['publishedAt:desc'],
    });
    
    return response.data as unknown as Article[];
  } catch (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
}

export async function getArticleBySlug(slug: string, locale: string): Promise<Article | null> {
  try {
    const articles = strapiClient.collection('articles');
    const response = await articles.find({
      locale,
      filters: {
        slug: {
          $eq: slug,
        },
      },
      populate: ['featuredImage', 'category', 'author', 'author.avatar', 'tags'],
    });
    
    return (response.data[0] as unknown as Article) || null;
  } catch (error) {
    console.error(`Error fetching article with slug ${slug}:`, error);
    return null;
  }
}

export async function getAllCategories(locale: string): Promise<Category[]> {
  try {
    const categories = strapiClient.collection('categories');
    const response = await categories.find({
      locale,
      sort: ['name:asc'],
    });
    
    return response.data as unknown as Category[];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export async function getArticlesByCategory(categoryId: number, locale: string): Promise<Article[]> {
  try {
    const articles = strapiClient.collection('articles');
    const response = await articles.find({
      locale,
      filters: {
        category: {
          id: {
            $eq: categoryId,
          },
        },
      },
      populate: ['featuredImage', 'category', 'author', 'author.avatar'],
      sort: ['publishedAt:desc'],
    });
    
    return response.data as unknown as Article[];
  } catch (error) {
    console.error(`Error fetching articles for category ${categoryId}:`, error);
    return [];
  }
}

export async function getAllAuthors(): Promise<Author[]> {
  try {
    const authors = strapiClient.collection('authors');
    const response = await authors.find({
      populate: ['avatar'],
    });
    
    return response.data as unknown as Author[];
  } catch (error) {
    console.error('Error fetching authors:', error);
    return [];
  }
}

// Function to get the absolute URL for Strapi media
export function getStrapiMediaUrl(media?: StrapiMedia): string {
  if (!media) return '';
  
  const { url } = media;
  const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
  
  // If the URL is already absolute, return it as is
  if (url.startsWith('http')) {
    return url;
  }
  
  // Otherwise, prepend the base URL
  return `${baseUrl}${url}`;
} 