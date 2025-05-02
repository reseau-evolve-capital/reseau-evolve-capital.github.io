'use client';

import React, { useState } from 'react';
import { 
  FaLinkedinIn, 
  FaTwitter, 
  FaWhatsapp, 
  FaRegCopy
} from 'react-icons/fa';

interface SocialShareButtonsProps {
  url: string;
  title: string;
  locale: string;
}

export default function SocialShareButtons({ url, title, locale }: SocialShareButtonsProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  // Ensure the URL is absolute
  const absoluteUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_SITE_URL || 'https://reseauevolvecapital.com'}${url}`;
  
  // Prepare sharing URLs
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(absoluteUrl)}&title=${encodeURIComponent(title)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(absoluteUrl)}&text=${encodeURIComponent(title)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title} ${absoluteUrl}`)}`;
  
  // Instagram doesn't support direct sharing via URL, so we'll copy to clipboard
//   const handleInstagramShare = () => {
//     navigator.clipboard.writeText(`${title} ${absoluteUrl}`).then(() => {
//       setCopySuccess(true);
//       setTimeout(() => setCopySuccess(false), 3000);
//       alert(locale === 'en' 
//         ? 'Link copied! Now you can paste it into Instagram.' 
//         : 'Lien copié ! Vous pouvez maintenant le coller sur Instagram.');
//     }).catch(err => {
//       console.error('Failed to copy text: ', err);
//     });
//   };
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(absoluteUrl).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }).catch(err => {
      console.error('Failed to copy link: ', err);
    });
  };
  
  // Translations
  const shareText = locale === 'en' ? 'Share this article' : 'Partager cet article';
  const copyLinkText = locale === 'en' ? 'Copy link' : 'Copier le lien';
  const copiedText = locale === 'en' ? 'Copied!' : 'Copié !';
  
  return (
    <div className="my-8 border-t border-b border-gray-200 py-6">
      <p className="mb-4 text-sm font-medium text-gray-700">{shareText}</p>
      <div className="flex flex-wrap items-center gap-3">
        {/* LinkedIn */}
        <a 
          href={linkedinUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0077B5] text-white transition-transform hover:scale-110"
          aria-label="Share on LinkedIn"
        >
          <FaLinkedinIn className="text-lg" />
        </a>
        
        {/* Twitter */}
        <a 
          href={twitterUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1DA1F2] text-white transition-transform hover:scale-110"
          aria-label="Share on Twitter"
        >
          <FaTwitter className="text-lg" />
        </a>
        
        {/* WhatsApp */}
        <a 
          href={whatsappUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white transition-transform hover:scale-110"
          aria-label="Share on WhatsApp"
        >
          <FaWhatsapp className="text-lg" />
        </a>
        
        {/* Instagram (Copy to clipboard) */}
        {/* <button
          onClick={handleInstagramShare}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E1306C] text-white transition-transform hover:scale-110"
          aria-label="Share on Instagram"
        >
          <FaInstagram className="text-lg" />
        </button> */}
        
        {/* Copy Link */}
        <button
          onClick={handleCopyLink}
          className="ml-auto flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
          aria-label="Copy link"
        >
          {copySuccess ? copiedText : copyLinkText}
          <FaRegCopy className={copySuccess ? "text-green-500" : ""} />
        </button>
      </div>
    </div>
  );
} 