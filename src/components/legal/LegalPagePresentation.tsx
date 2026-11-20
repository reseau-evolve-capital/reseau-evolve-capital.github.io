'use client';

import { motion } from 'framer-motion';
import { BlocksRenderer, type BlocksContent } from '@strapi/blocks-react-renderer';
import { Section } from '@/components/ui/Section';
import type { LegalSection } from '@/lib/content-types';
import type { SectionProps } from '@/components/sections/components';
import { copy } from '@/lib/copy';
import { Calendar } from 'lucide-react';

export function LegalPagePresentation({ data, ctx }: SectionProps<LegalSection>) {
  const { locale } = ctx;

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
              {data.title}
            </h1>
            {data.lastUpdated && (
              <div className="flex items-center justify-center text-neutral-300">
                <Calendar className="w-5 h-5 mr-2" />
                <span>
                  {copy[locale].lastUpdated}
                  {new Date(data.lastUpdated).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { timeZone: 'UTC' })}
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </Section>

      {/* Content Section */}
      <Section className="bg-white py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-8">
            {Array.isArray(data.body) && data.body.length > 0 && (
              <BlocksRenderer
                content={data.body as unknown as BlocksContent}
                blocks={{
                  heading: ({ children, level }) =>
                    level === 2 ? (
                      <h2 className="text-2xl font-heading mb-4 mt-12 first:mt-0 text-[#231F20] border-b border-neutral-200 pb-2">
                        {children}
                      </h2>
                    ) : (
                      <h3 className="text-xl font-heading mb-3 mt-8 text-[#231F20]">{children}</h3>
                    ),
                  paragraph: ({ children }) => <p className="text-neutral-700 mb-4 last:mb-0">{children}</p>,
                }}
              />
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
