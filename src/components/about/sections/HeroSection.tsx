'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { type Locale } from '@/config/site-config';
import { aboutUsContent } from '@/config/about-us-config';
import Link from 'next/link';
interface HeroSectionProps {
    locale: Locale;
}

export function HeroSection({ locale }: HeroSectionProps) {
    const { hero } = aboutUsContent;

    return (
        <Section className="relative min-h-[80vh] flex items-center bg-gradient-to-br from-[#231F20] to-black text-white">
            <div className="absolute inset-0 opacity-30">
                <Image
                    src={hero.image}
                    alt={hero.headline[locale]}
                    fill
                    className="object-cover"
                    priority
                />
            </div>
            <div className="relative z-10 max-w-4xl mx-auto text-center">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-6xl font-heading mb-6 bg-gradient-to-r from-[#FFF33B] via-[#F3903F] to-[#E93E3A] text-transparent bg-clip-text"
                >
                    {hero.headline[locale]}
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto"
                >
                    {hero.subheadline[locale]}
                </motion.p>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Button
                        size="lg"
                        className="group"
                    >
                        <Link href={`/${locale}/contact`}>
                            {hero.cta.label[locale]}
                        </Link>
                    </Button>
                </motion.div>
            </div>
        </Section>
    );
} 