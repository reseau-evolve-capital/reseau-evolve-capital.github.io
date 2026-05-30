import Image from 'next/image';
import Link from 'next/link';
import { Article, getStrapiMediaUrl } from '@/lib/api';
import BlocksRenderer from '@/components/blog/BlocksRenderer';
import SocialShareButtons from '@/components/blog/SocialShareButtons';
import AuthorBio from '@/components/blog/AuthorBio';
import { formatDate } from '@/lib/utils';

interface BlogArticleContentProps {
  article: Article;
  locale: string;
  translations: {
    publishedOn: string;
    category: string;
    author: string;
    backToList: string;
  };
}

export default function BlogArticleContent({ 
  article, 
  locale, 
  translations 
}: BlogArticleContentProps) {
  const imageUrl = getStrapiMediaUrl(article.featuredImage);
  const articleUrl = `/${locale}/blog/${article.slug}`;
  const authorAvatarUrl = article.author?.avatar ? getStrapiMediaUrl(article.author.avatar) : null;
  
  return (
    <>
      {/* Back link */}
      <div className="mb-8">
        <Link 
          href={`/${locale}/blog`}
          className="inline-flex items-center text-[#E93E3A] hover:text-[#F3903F]"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="mr-2 h-5 w-5" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" 
              clipRule="evenodd" 
            />
          </svg>
          {translations.backToList}
        </Link>
      </div>
      
      {/* Article header */}
      <div className="mb-8">
        <h1 className="mb-6 text-4xl font-bold leading-tight text-gray-900">{article.title}</h1>
        
        {/* Meta information */}
        <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-600">
          {/* Publication date */}
          <div className="flex items-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="mr-2 h-5 w-5 text-gray-400" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" 
                clipRule="evenodd" 
              />
            </svg>
            <span>
              {translations.publishedOn} {formatDate(article.publishedAt, locale)}
            </span>
          </div>
          
          {/* Category */}
          {article.category && (
            <div className="flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="mr-2 h-5 w-5 text-gray-400" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" 
                  clipRule="evenodd" 
                />
              </svg>
              <span>
                {translations.category}: {article.category.name}
              </span>
            </div>
          )}
          
          {/* Author with avatar */}
          {article.author && (
            <div className="flex items-center">
              {authorAvatarUrl ? (
                <div className="relative mr-2 h-8 w-8 overflow-hidden rounded-full">
                  <Image
                    src={authorAvatarUrl}
                    alt={article.author.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="mr-2 h-5 w-5 text-gray-400" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" 
                    clipRule="evenodd" 
                  />
                </svg>
              )}
              <span>
                {translations.author}: {article.author.name}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Featured image */}
      {imageUrl && (
        <div className="mb-8 overflow-hidden rounded-lg">
          <div className="relative mx-auto h-[400px] w-full max-w-4xl">
            <Image
              src={imageUrl}
              alt={article.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      )}
      
      {/* Article content */}
      <div className="prose prose-lg mx-auto max-w-3xl">
        <BlocksRenderer content={article.content} />
        
        {/* Social Share Buttons */}
        <SocialShareButtons 
          url={articleUrl}
          title={article.title}
          locale={locale}
        />
        
        {/* Author Bio Section */}
        {article.author && (
          <AuthorBio 
            author={article.author}
            locale={locale}
          />
        )}
      </div>
    </>
  );
} 