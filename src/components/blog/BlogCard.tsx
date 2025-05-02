import Image from 'next/image';
import Link from 'next/link';
import { Article } from '@/lib/api';
import { getStrapiMediaUrl } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface BlogCardProps {
  article: Article;
  locale: string;
}

export default function BlogCard({ article, locale }: BlogCardProps) {
  console.log("article", article);
  // Access properties directly from article instead of using attributes
  const imageUrl = getStrapiMediaUrl(article.featuredImage);
  
  // Create the article URL
  const articleUrl = `/${locale}/blog/${article.slug}`;
  
  return (
    <div className="group flex flex-col h-full overflow-hidden rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl bg-white">
      {/* Featured Image */}
      <div className="relative h-48 w-full overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-200">
            <span className="text-gray-500">No image</span>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex flex-col flex-grow p-6">
        {/* Category */}
        {article.category && (
          <div className="mb-2">
            <span className="inline-block rounded-full bg-[#F3903F] px-3 py-1 text-xs font-semibold text-white">
              {article.category.name}
            </span>
          </div>
        )}
        
        {/* Title */}
        <h3 className="mb-2 text-xl font-bold leading-tight text-gray-900 transition-colors group-hover:text-[#E93E3A]">
          <Link href={articleUrl} className="hover:underline">
            {article.title}
          </Link>
        </h3>
        
        {/* Excerpt */}
        <p className="mb-4 flex-grow text-sm text-gray-700">
          {article.excerpt || article.title}
        </p>
        
        {/* Footer */}
        <div className="mt-auto flex items-center justify-between">
          {/* Author */}
          <div className="flex items-center">
            {article.author && article.author.avatar && (
              <div className="relative mr-2 h-8 w-8 overflow-hidden rounded-full">
                <Image
                  src={getStrapiMediaUrl(article.author.avatar)}
                  alt={article.author.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <span className="text-xs text-gray-600">
              {article.author ? article.author.name : 'Admin'}
            </span>
          </div>
          
          {/* Date */}
          <span className="text-xs text-gray-500">
            {formatDate(article.publishedAt, locale)}
          </span>
        </div>
      </div>
    </div>
  );
} 