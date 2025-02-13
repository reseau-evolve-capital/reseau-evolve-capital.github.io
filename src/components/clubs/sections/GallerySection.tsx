'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Section } from '@/components/ui/Section';
import { type Club, type Locale } from '@/config/site-config';
import { siteConfig } from '@/config/site-config';

interface GallerySectionProps {
    club: Club;
    locale: Locale;
}

export function GallerySection({ club, locale }: GallerySectionProps) {
    return (
        <Section className="bg-neutral-50">
            <div className="max-w-4xl mx-auto">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl font-heading text-center mb-12"
                >
                    {siteConfig.sectionTitles.gallery[locale]}
                </motion.h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {club.gallery.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="relative aspect-square rounded-xl overflow-hidden group"
                        >
                            <Image
                                src={item.image}
                                alt={item.caption[locale]}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                    <p className="text-white text-sm">{item.caption[locale]}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </Section>
    );
} 