'use client';

import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import type { ContactIntroSection } from '@/lib/content-types';
import type { SectionProps } from '@/components/sections/components';

export function ContactHero({ data }: SectionProps<ContactIntroSection>) {
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
                        {data.title}
                    </h1>
                    {data.content && (
                        <p className="text-xl text-neutral-300 max-w-2xl mx-auto">
                            {data.content}
                        </p>
                    )}
                </motion.div>
            </div>
        </Section>
    );
}
