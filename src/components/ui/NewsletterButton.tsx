'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { type Locale } from '@/config/site-config';
import { useNewsletter } from '@/components/newsletter';

interface NewsletterButtonProps {
  locale: Locale;
  variant?: 'default' | 'outline' | 'hero';
  className?: string;
}

export function NewsletterButton({ 
  locale, 
  variant = 'default',
  className = '' 
}: NewsletterButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const { showPopup } = useNewsletter();

  // Periodically trigger attention animation
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    }, 10000); // Every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

    const handleClick = () => {
      showPopup();
    };

  if (variant === 'hero') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className={className}
      >
        <motion.button
          animate={isAnimating ? { scale: [1, 1.05, 1] } : {}}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleClick}
          className="relative overflow-hidden group bg-gradient-to-r from-[#FFF33B] to-[#F3903F] text-[#231F20] font-bold px-8 py-4 rounded-full shadow-lg flex items-center gap-3"
        >
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-[#F3903F] to-[#E93E3A] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          <Mail className="w-5 h-5 z-10 group-hover:text-white transition-colors duration-300" />
          <span className="z-10 group-hover:text-white transition-colors duration-300">
            {locale === 'fr' 
              ? 'Abonnez-vous à notre newsletter' 
              : 'Subscribe to our newsletter'}
          </span>
        </motion.button>
      </motion.div>
    );
  }
  
  return (
    <Button
      onClick={handleClick}
      variant={variant}
      className={`flex items-center gap-2 ${className}`}
    >
      <Mail className="w-4 h-4" />
      {locale === 'fr' ? 'Newsletter' : 'Newsletter'}
    </Button>
  );
} 