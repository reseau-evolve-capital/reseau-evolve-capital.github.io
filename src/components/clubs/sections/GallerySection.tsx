'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Section } from '@/components/ui/Section';
import type { ClubDoc, Locale } from '@/lib/content-types';
import { imageUrl } from '@/lib/media';
import { copy } from '@/lib/copy';

interface GallerySectionProps {
    club: ClubDoc;
    locale: Locale;
}

export function GallerySection({ club, locale }: GallerySectionProps) {
    const items = club.gallery.flatMap((item) => {
        const src = imageUrl(item.image);
        return src ? [{ src, caption: item.caption, alt: item.caption ?? item.alt ?? club.name }] : [];
    });
    if (items.length === 0) return null;
    return (
        <Section className="bg-neutral-50">
            <div className="max-w-4xl mx-auto">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl font-heading text-center mb-12"
                >
                    {copy[locale].gallery}
                </motion.h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {items.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="relative aspect-square rounded-xl overflow-hidden group"
                        >
                            <Image
                                src={item.src}
                                alt={item.alt}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                            {item.caption && (
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="absolute bottom-0 left-0 right-0 p-4">
                                        <p className="text-white text-sm">{item.caption}</p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </Section>
    );
} 