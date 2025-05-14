import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Article, getAllArticles, getStrapiMediaUrl } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface RelatedArticlesProps {
  currentArticle: Article;
  locale: string;
  maxArticles?: number;
}
//improve this to reduce fetch by improving the query
export default async function RelatedArticles({ 
  currentArticle, 
  locale, 
  maxArticles = 3 
}: RelatedArticlesProps) {
  // Get all articles
  const allArticles = await getAllArticles(locale);
  
  // Exclude the current article
  const otherArticles = allArticles.filter(article => article.id !== currentArticle.id);
  
  // Find related articles by:
  // 1. Same category
  // 2. Same tags (if available)
  // 3. Fallback to recent articles
  
  let relatedArticles: Article[] = [];
  
  // 1. Same category
  if (currentArticle.category) {
    const sameCategory = otherArticles.filter(
      article => article.category?.id === currentArticle.category?.id
    );
    relatedArticles = [...relatedArticles, ...sameCategory];
  }
  
  // 2. Same tags (if available)
  if (currentArticle.tags && currentArticle.tags.length > 0) {
    const currentTags = currentArticle.tags.map(tag => tag.id);
    const sameTag = otherArticles.filter(article => 
      article.tags && article.tags.some(tag => currentTags.includes(tag.id))
    );
    
    // Add articles with same tags, avoiding duplicates
    sameTag.forEach(article => {
      if (!relatedArticles.some(a => a.id === article.id)) {
        relatedArticles.push(article);
      }
    });
  }
  
  // 3. If we still don't have enough articles, add recent ones
  if (relatedArticles.length < maxArticles) {
    const recentArticles = otherArticles
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .filter(article => !relatedArticles.some(a => a.id === article.id));
    
    relatedArticles = [...relatedArticles, ...recentArticles];
  }
  
  // Limit to maxArticles
  relatedArticles = relatedArticles.slice(0, maxArticles);
  
  // If no related articles (unlikely), return null
  if (relatedArticles.length === 0) {
    return null;
  }
  
  // Translations
  const translations = {
    title: locale === 'en' ? 'You might also like' : 'Vous pourriez aussi aimer',
    readMore: locale === 'en' ? 'Read more' : 'Lire la suite',
  };
  
  return (
    <div className="mt-16 border-t border-gray-200 pt-12">
      <h2 className="mb-8 text-2xl font-bold text-gray-900">{translations.title}</h2>
      
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {relatedArticles.map((article) => {
          const imageUrl = getStrapiMediaUrl(article.featuredImage);
          const articleUrl = `/${locale}/blog/${article.slug}`;
          
          return (
            <div key={article.id} className="group flex flex-col overflow-hidden rounded-lg shadow-md transition-all duration-300 hover:shadow-xl">
              {/* Image */}
              <div className="relative h-40 w-full overflow-hidden">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={article.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-200">
                    <span className="text-gray-500">No image</span>
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="flex flex-1 flex-col p-4">
                {/* Category */}
                {article.category && (
                  <div className="mb-2">
                    <span className="inline-block rounded-full bg-[#F3903F] px-2 py-1 text-xs font-semibold text-white">
                      {article.category.name}
                    </span>
                  </div>
                )}
                
                {/* Title */}
                <h3 className="mb-2 text-lg font-semibold text-gray-900 group-hover:text-[#E93E3A]">
                  <Link href={articleUrl} className="hover:underline">
                    {article.title}
                  </Link>
                </h3>
                
                {/* Excerpt */}
                <p className="mb-4 flex-1 text-sm text-gray-700 line-clamp-2">
                  {article.excerpt}
                </p>
                
                {/* Footer */}
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {formatDate(article.publishedAt, locale)}
                  </span>
                  
                  <Link 
                    href={articleUrl}
                    className="text-sm font-medium text-[#E93E3A] hover:text-[#F3903F] hover:underline"
                  >
                    {translations.readMore}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 