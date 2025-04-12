'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';
import { type Locale } from '@/config/site-config';
import { siteConfig } from '@/config/site-config';
import confetti from 'canvas-confetti';
import { subscribeToNewsletter, isValidEmail } from '@/lib/newsletter';

interface NewsletterPopupProps {
  locale: Locale;
  // Time in seconds before the popup appears
  delayTime?: number;
  // If true, will show popup only once per session
  showOncePerSession?: boolean;
  // Optional callback when popup is closed
  onClose?: () => void;
}

export function NewsletterPopup({ 
  locale, 
  delayTime = 10, 
  showOncePerSession = true,
  onClose
}: NewsletterPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [animationStage, setAnimationStage] = useState(0);
  
  const content = siteConfig.pageContent.home.footer.newsletter;
  
  useEffect(() => {
    // Check if we've shown this popup already in this session
    if (showOncePerSession) {
      const hasSeenPopup = sessionStorage.getItem('hasSeenNewsletterPopup');
      if (hasSeenPopup) return;
    }

    // Set a timer to show the popup after the configured delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delayTime * 1000);

    return () => clearTimeout(timer);
  }, [delayTime, showOncePerSession]);

  const runConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFF33B', '#FDC70C', '#F3903F', '#E93E3A']
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setEmailError('');

    // Validate email
    if (!email || !isValidEmail(email)) {
      setEmailError(locale === 'fr' ? 'Veuillez entrer une adresse email valide' : 'Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }

    try {
      // Call our newsletter API
      const response = await subscribeToNewsletter({
        email,
        locale,
        source: 'newsletter_popup'
      });

      if (response.success) {
        setIsSubscribed(true);
        if (showOncePerSession) {
          sessionStorage.setItem('hasSeenNewsletterPopup', 'true');
        }
        runConfetti();
      } else if (response.alreadyRegistered) {
        // Already registered is not an error, we treat it as success
        setIsSubscribed(true);
        if (showOncePerSession) {
          sessionStorage.setItem('hasSeenNewsletterPopup', 'true');
        }
        runConfetti();
      } else {
        setEmailError(
          locale === 'fr' 
            ? 'Une erreur est survenue. Veuillez réessayer.' 
            : 'An error occurred. Please try again.'
        );
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setEmailError(
        locale === 'fr' 
          ? 'Une erreur est survenue. Veuillez réessayer.' 
          : 'An error occurred. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const closePopup = () => {
    setIsVisible(false);
    
    if (showOncePerSession) {
      sessionStorage.setItem('hasSeenNewsletterPopup', 'true');
    }
    
    // Call the onClose callback if provided
    if (onClose) {
      onClose();
    }
  };

  // Every 3 seconds, cycle through animation stages
  useEffect(() => {
    if (!isVisible || isSubscribed) return;
    
    const interval = setInterval(() => {
      setAnimationStage(prev => (prev + 1) % 3);
    }, 8000);
    
    return () => clearInterval(interval);
  }, [isVisible, isSubscribed]);

  const getHeadlineText = () => {
    if (locale === 'fr') {
      switch(animationStage) {
        case 0: return "Restez à la pointe de l'investissement !";
        case 1: return "Ne manquez aucune opportunité !";
        case 2: return "Rejoignez notre communauté d'investisseurs !";
        default: return "Restez à la pointe de l'investissement !";
      }
    } else {
      switch(animationStage) {
        case 0: return "Stay at the forefront of investing!";
        case 1: return "Don't miss any opportunity!";
        case 2: return "Join our investor community!";
        default: return "Stay at the forefront of investing!";
      }
    }
  };

  const getDescriptionText = () => {
    if (locale === 'fr') {
      switch(animationStage) {
        case 0: return "Recevez des analyses exclusives et des conseils d'experts directement dans votre boîte mail";
        case 1: return "Soyez informé des meilleurs événements et occasions d'investissement avant tout le monde";
        case 2: return "Plus de 100 investisseurs nous font déjà confiance pour leur éducation financière";
        default: return "Recevez des analyses exclusives et des conseils d'experts directement dans votre boîte mail";
      }
    } else {
      switch(animationStage) {
        case 0: return "Receive exclusive analysis and expert advice directly in your inbox";
        case 1: return "Be informed of the best events and investment opportunities before everyone else";
        case 2: return "Over 100 investors already trust us for their financial education";
        default: return "Receive exclusive analysis and expert advice directly in your inbox";
      }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && closePopup()}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="relative bg-white rounded-xl shadow-2xl overflow-hidden max-w-lg w-full"
          >
            {/* Close button */}
            <button
              onClick={closePopup}
              className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-700 z-10"
              aria-label={locale === 'fr' ? "Fermer" : "Close"}
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex flex-col md:flex-row">
              {/* Left column - Image/Visual */}
              <div className="relative bg-gradient-to-br from-[#FFF33B] to-[#F3903F] p-6 md:w-2/5 flex items-center justify-center">
                <div className="absolute inset-0 opacity-10">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="none" stroke="currentColor" strokeWidth="0.5"></path>
                    <path d="M0,20 L100,20 M0,40 L100,40 M0,60 L100,60 M0,80 L100,80" stroke="currentColor" strokeWidth="0.5"></path>
                    <path d="M20,0 L20,100 M40,0 L40,100 M60,0 L60,100 M80,0 L80,100" stroke="currentColor" strokeWidth="0.5"></path>
                  </svg>
                </div>
                <div className="relative z-10 text-center">
                  <Image
                    src="/brand/logo.png"
                    alt="Réseau Evolve Capital"
                    width={150}
                    height={150}
                    className="mb-4 mx-auto"
                  />
                  <div className="bg-white/90 p-3 rounded-lg backdrop-blur-sm mb-4">
                    <h3 className="text-lg font-bold text-[#231F20]">
                      {locale === 'fr' ? "Évoluez avec nous" : "Evolve with us"}
                    </h3>
                  </div>
                  <div className="flex justify-center space-x-2">
                    {[0, 1, 2].map((i) => (
                      <button
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          animationStage === i ? 'bg-white' : 'bg-white/30'
                        }`}
                        onClick={() => setAnimationStage(i)}
                        aria-label={`Slide ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Right column - Form */}
              <div className="p-6 md:p-8 md:w-3/5">
                {isSubscribed ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-8"
                  >
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold mb-2 text-[#231F20]">
                      {locale === 'fr' ? "Merci de votre inscription !" : "Thanks for subscribing!"}
                    </h3>
                    <p className="text-neutral-600 mb-6">
                      {locale === 'fr' 
                        ? "Vous recevrez bientôt nos meilleurs conseils et opportunités d'investissement." 
                        : "You'll soon receive our best tips and investment opportunities."}
                    </p>
                    <Button onClick={closePopup}>
                      {locale === 'fr' ? "Continuer ma visite" : "Continue browsing"}
                    </Button>
                  </motion.div>
                ) : (
                  <>
                    <div className="mb-6">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`headline-${animationStage}`}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.3 }}
                        >
                          <h2 className="text-2xl md:text-3xl font-bold mb-2 text-[#231F20]">
                            {getHeadlineText()}
                          </h2>
                        </motion.div>
                      </AnimatePresence>
                      
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`description-${animationStage}`}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                        >
                          <p className="text-neutral-600">
                            {getDescriptionText()}
                          </p>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 text-neutral-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (emailError) setEmailError('');
                          }}
                          placeholder={content.placeholder[locale]}
                          className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                            emailError ? 'border-red-500' : 'border-neutral-300'
                          } focus:outline-none focus:ring-2 focus:ring-[#F3903F] focus:border-transparent`}
                          required
                        />
                      </div>
                      
                      {emailError && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm text-red-500"
                        >
                          {emailError}
                        </motion.p>
                      )}
                      
                      <div className="flex items-center">
                        <Button 
                          type="submit" 
                          className="w-full flex items-center justify-center gap-2"
                          isLoading={isSubmitting}
                          disabled={isSubmitting}
                        >
                          {content.button[locale]}
                          {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                        </Button>
                      </div>
                      
                      <p className="text-xs text-neutral-500 text-center mt-4">
                        {locale === 'fr' 
                          ? "En vous inscrivant, vous acceptez de recevoir des emails de notre part. Vous pourrez vous désinscrire à tout moment." 
                          : "By signing up, you agree to receive emails from us. You can unsubscribe at any time."}
                      </p>
                    </form>
                  </>
                )}
              </div>
            </div>
            
            {/* Bottom ribbon */}
            <div className="bg-[#231F20] text-white py-2 px-4 text-center text-sm">
              {locale === 'fr' 
                ? "Rejoignez plus de 100 membres actifs dans notre réseau !"
                : "Join over 100 active members in our network!"}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 