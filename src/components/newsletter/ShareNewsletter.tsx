'use client';

import { useState } from 'react';
import { Share2, Facebook, Twitter, Linkedin, CheckCircle, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { type Locale } from '@/config/site-config';
import { generateNewsletterShareUrl } from '@/lib/newsletter';

interface ShareNewsletterProps {
  locale: Locale;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline' | 'subtle';
}

export function ShareNewsletter({ 
  locale, 
  className = '',
  size = 'md',
  variant = 'outline' 
}: ShareNewsletterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Dynamically generate the share URL based on the current page
  const shareUrl = typeof window !== 'undefined' 
    ? generateNewsletterShareUrl(locale, window.location.pathname)
    : '';
  
  // Social media share URLs
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Rejoignez notre newsletter pour suivre les actualités de Réseau Evolve Capital!')}`;
  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  // Handle direct link copy
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Size classes
  const sizeClasses = {
    sm: 'text-sm py-1 px-2',
    md: 'text-base py-2 px-3',
    lg: 'text-lg py-2.5 px-4'
  };

  // Variant classes
  const variantClasses = {
    primary: 'bg-gradient-to-r from-[#F3903F] to-[#E93E3A] text-white hover:brightness-110',
    secondary: 'bg-[#F3903F] text-white hover:brightness-110',
    outline: 'border border-[#F3903F] text-[#F3903F] hover:bg-[#F3903F] hover:text-white',
    subtle: 'text-[#F3903F] hover:bg-orange-50'
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 ${variantClasses[variant]} ${sizeClasses[size]}`}
      >
        <Share2 className="w-4 h-4" />
        <span>{locale === 'fr' ? 'Partager' : 'Share'}</span>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 p-3 bg-white shadow-lg rounded-lg z-10 min-w-[220px]"
          >
            <div className="flex flex-col space-y-2">
              <p className="text-sm text-gray-600 mb-2">
                {locale === 'fr' 
                  ? 'Partager la newsletter' 
                  : 'Share the newsletter'}
              </p>
              
              <Button 
                onClick={() => window.open(facebookShareUrl, '_blank')}
                variant="ghost"
                className="flex items-center gap-2 w-full justify-start hover:bg-blue-50"
              >
                <Facebook className="w-4 h-4 text-blue-600" />
                <span>Facebook</span>
              </Button>
              
              <Button 
                onClick={() => window.open(twitterShareUrl, '_blank')}
                variant="ghost"
                className="flex items-center gap-2 w-full justify-start hover:bg-blue-50"
              >
                <Twitter className="w-4 h-4 text-blue-400" />
                <span>Twitter</span>
              </Button>
              
              <Button 
                onClick={() => window.open(linkedinShareUrl, '_blank')}
                variant="ghost"
                className="flex items-center gap-2 w-full justify-start hover:bg-blue-50"
              >
                <Linkedin className="w-4 h-4 text-blue-700" />
                <span>LinkedIn</span>
              </Button>
              
              <div className="border-t border-gray-200 my-2 pt-2">
                <Button 
                  onClick={handleCopyLink}
                  variant="ghost"
                  className="flex items-center gap-2 w-full justify-start hover:bg-gray-50"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-500">
                        {locale === 'fr' ? 'Copié!' : 'Copied!'}
                      </span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4 text-gray-600" />
                      <span>
                        {locale === 'fr' ? 'Copier le lien' : 'Copy link'}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 