'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type Locale } from '@/config/site-config';
import { homeSectionIds } from '@/lib/navigation';
import { scrollToElement } from '@/lib/scroll';

interface SectionNavigationProps {
  locale: Locale;
}

interface SectionLink {
  id: string;
  labelFr: string;
  labelEn: string;
}

export function SectionNavigation({ locale }: SectionNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const sectionLinks: SectionLink[] = useMemo(() => [
    { id: homeSectionIds.hero, labelFr: 'Accueil', labelEn: 'Home' },
    { id: homeSectionIds.introduction, labelFr: 'Introduction', labelEn: 'Introduction' },
    { id: homeSectionIds.valueProposition, labelFr: 'Proposition de Valeur', labelEn: 'Value Proposition' },
    { id: homeSectionIds.clubs, labelFr: 'Clubs', labelEn: 'Clubs' },
    { id: homeSectionIds.events, labelFr: 'Événements', labelEn: 'Events' },
    { id: homeSectionIds.resources, labelFr: 'Ressources', labelEn: 'Resources' },
    { id: homeSectionIds.membership, labelFr: 'Adhésion', labelEn: 'Membership' },
    { id: homeSectionIds.partnerships, labelFr: 'Partenariats', labelEn: 'Partnerships' }
  ], []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150; // Adjust offset as needed
      
      // Find the current section based on scroll position
      let currentSection: string = homeSectionIds.hero;
      
      for (const link of sectionLinks) {
        const element = document.getElementById(link.id);
        if (element && element.offsetTop <= scrollPosition) {
          currentSection = link.id;
        }
      }
      
      setActiveSection(currentSection);
    };
    
    window.addEventListener('scroll', handleScroll);
    // Initialize on mount
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sectionLinks]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigate to section and close menu
  const navigateToSection = (sectionId: string) => {
    scrollToElement(sectionId);
    setIsOpen(false);
  };

  return (
    <div 
      ref={menuRef}
      className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden md:block"
    >
      <div className="relative">
        {/* Toggle Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 rounded-full bg-[#231F20] text-white shadow-lg flex items-center justify-center"
          aria-label={isOpen ? "Close section navigation" : "Open section navigation"}
        >
          {isOpen ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
        </motion.button>
        
        {/* Section Navigation Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute right-14 top-0 bg-white rounded-lg shadow-xl p-3 w-64"
            >
              <h3 className="text-lg font-medium text-[#231F20] mb-2 px-3">
                {locale === 'fr' ? 'Sections' : 'Sections'}
              </h3>
              <nav className="space-y-1">
                {sectionLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => navigateToSection(link.id)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center ${
                      activeSection === link.id
                        ? 'bg-[#F3903F]/10 text-[#F3903F] font-medium'
                        : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    <span>{locale === 'fr' ? link.labelFr : link.labelEn}</span>
                    {activeSection === link.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 rounded-full bg-[#F3903F] ml-auto"
                      />
                    )}
                  </button>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 