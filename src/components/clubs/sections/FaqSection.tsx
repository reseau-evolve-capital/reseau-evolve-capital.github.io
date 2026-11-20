'use client';

import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import type { ClubDoc, Locale } from '@/lib/content-types';
import { copy } from '@/lib/copy';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqSectionProps {
    club: ClubDoc;
    locale: Locale;
}

export function FaqSection({ club, locale }: FaqSectionProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    if (club.faq.length === 0) return null;

    return (
        <Section>
            <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-heading text-center mb-12">{copy[locale].faq}</h2>
                <div className="space-y-4">
                    {club.faq.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white rounded-xl shadow-sm overflow-hidden"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="w-full flex items-center justify-between p-6 text-left"
                            >
                                <h3 className="font-heading text-xl">{item.question}</h3>
                                <ChevronDown
                                    className={`w-5 h-5 transition-transform ${openIndex === index ? 'rotate-180' : ''
                                        }`}
                                />
                            </button>
                            <div
                                className={`px-6 transition-all duration-200 ${openIndex === index ? 'pb-6 max-h-96' : 'max-h-0 overflow-hidden'
                                    }`}
                            >
                                <p className="text-neutral-600">{item.answer}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </Section>
    );
} 