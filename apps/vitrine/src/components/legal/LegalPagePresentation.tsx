'use client';

import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import { type Locale } from '@/config/site-config';
import { legalConfig } from '@/config/legal-config';
import { Calendar } from 'lucide-react';

interface LegalPagePresentationProps {
  locale: Locale;
  pageType: 'privacyPolicy' | 'termsOfService';
}

export function LegalPagePresentation({ locale, pageType }: LegalPagePresentationProps) {
  const legalPage = legalConfig[pageType];
  
  if (!legalPage) return null;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <Section className="bg-gradient-to-br from-[#231F20] to-black text-white pt-32 pb-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-heading mb-6">
              {legalPage.title[locale]}
            </h1>
            <div className="flex items-center justify-center text-neutral-300">
              <Calendar className="w-5 h-5 mr-2" />
              <span>
                {locale === 'fr' 
                  ? `Dernière mise à jour : ${new Date(legalPage.lastUpdated).toLocaleDateString('fr-FR')}`
                  : `Last updated: ${new Date(legalPage.lastUpdated).toLocaleDateString('en-US')}`
                }
              </span>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Content Section */}
      <Section className="bg-white py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-8">
            {/* Display each section */}
            {legalPage.sections.map((section, sectionIndex) => (
              <motion.div
                key={sectionIndex}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: sectionIndex * 0.1 }}
                className="mb-12 last:mb-0"
              >
                <h2 className="text-2xl font-heading mb-4 text-[#231F20] border-b border-neutral-200 pb-2">
                  {section.title[locale]}
                </h2>
                <div className="space-y-4">
                  {section.content.map((paragraph, paraIndex) => (
                    <p 
                      key={paraIndex} 
                      className="text-neutral-700"
                      dangerouslySetInnerHTML={{ __html: paragraph[locale] }}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
} 