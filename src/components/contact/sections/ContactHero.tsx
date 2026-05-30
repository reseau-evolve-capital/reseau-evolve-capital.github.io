'use client';

import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import { type Locale } from '@/config/site-config';
import { aboutUsContent } from '@/config/about-us-config';

interface ContactHeroProps {
    locale: Locale;
}

export function ContactHero({ locale }: ContactHeroProps) {
    const { contact } = aboutUsContent;

    return (
        <Section className="bg-gradient-to-br from-[#231F20] to-black text-white pt-32 pb-20">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center"
                >
                    <h1 className="text-4xl md:text-6xl font-heading mb-6">
                        {contact.title[locale]}
                    </h1>
                    <p className="text-xl text-neutral-300 max-w-2xl mx-auto">
                        {contact.content[locale]}
                    </p>
                </motion.div>
            </div>
        </Section>
    );
} 