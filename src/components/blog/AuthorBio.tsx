import Image from 'next/image';
import Link from 'next/link';
import { Author, getStrapiMediaUrl } from '@/lib/api';
import BlocksRenderer from '@/components/blog/BlocksRenderer';
import { FaLinkedin, FaTwitter, FaGlobe } from 'react-icons/fa';

interface AuthorBioProps {
  author: Author;
  locale: string;
}

export default function AuthorBio({ author, locale }: AuthorBioProps) {
  if (!author) return null;

  const avatarUrl = author.avatar ? getStrapiMediaUrl(author.avatar) : null;
  
  // Label translations
  const authorLabel = locale === 'en' ? 'About the author' : 'À propos de l\'auteur';
  const followLabel = locale === 'en' ? 'Follow on' : 'Suivre sur';
  
  // Platform icons
  const socialIcons: Record<string, React.ReactNode> = {
    linkedin: <FaLinkedin />,
    twitter: <FaTwitter />,
    website: <FaGlobe />,
    // Add more platforms as needed
  };

  return (
    <div className="mt-12 border-t border-gray-200 pt-8">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">{authorLabel}</h2>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Author avatar */}
        {avatarUrl && (
          <div className="flex-shrink-0">
            <div className="relative h-24 w-24 overflow-hidden rounded-full">
              <Image
                src={avatarUrl}
                alt={author.name}
                fill
                className="object-cover"
              />
            </div>
          </div>
        )}
        
        {/* Author info */}
        <div className="flex-grow">
          <h3 className="mb-2 text-xl font-bold text-gray-900">{author.name}</h3>
          
          {/* Author bio */}
          {author.bio && (
            <div className="prose prose-sm mb-4 text-gray-700">
              <BlocksRenderer content={author.bio} />
            </div>
          )}
          
          {/* Social media links */}
          {author.socialMediaLinks && author.socialMediaLinks.length > 0 && (
            <div className="flex items-center space-x-3">
              {author.socialMediaLinks.map((social, index) => {
                const icon = socialIcons[social.platform.toLowerCase()] || <FaGlobe />;
                
                return (
                  <Link
                    key={index}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-gray-600 hover:text-[#E93E3A] transition-colors"
                    aria-label={`${followLabel} ${social.platform}`}
                  >
                    <span className="mr-1 text-lg">{icon}</span>
                    <span className="text-sm">{social.platform}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 