'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import type { AboutHeroSection } from '@/lib/content-types';
import { imageUrl } from '@/lib/media';
import type { SectionProps } from '@/components/sections/components';
import Link from 'next/link';
import { localeHref } from '@/lib/links';

export function HeroSection({ data: hero, ctx }: SectionProps<AboutHeroSection>) {
    const { locale } = ctx;
    const image = imageUrl(hero.image);

    return (
        <Section className="relative min-h-[80vh] flex items-center bg-gradient-to-br from-[#231F20] to-black text-white">
            {image && (
                <div className="absolute inset-0 opacity-30">
                    <Image
                        src={image}
                        alt={hero.headline}
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
            )}
            <div className="relative z-10 max-w-4xl mx-auto text-center">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-6xl font-heading mb-6 bg-gradient-to-r from-[#FFF33B] via-[#F3903F] to-[#E93E3A] text-transparent bg-clip-text"
                >
                    {hero.headline}
                </motion.h1>
                {hero.subheadline && (
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto"
                    >
                        {hero.subheadline}
                    </motion.p>
                )}
                {hero.ctaLabel && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Button
                            size="lg"
                            className="group"
                        >
                            <Link href={localeHref(locale, hero.ctaHref ?? '/contact')}>
                                {hero.ctaLabel}
                            </Link>
                        </Button>
                    </motion.div>
                )}
            </div>
        </Section>
    );
} 