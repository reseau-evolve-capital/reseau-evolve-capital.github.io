'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Section } from '@/components/ui/Section';
import { MapPin, Users, Calendar } from 'lucide-react';
import type { ClubDoc, Locale } from '@/lib/content-types';
import { imageUrl } from '@/lib/media';
import { copy } from '@/lib/copy';

interface HeroSectionProps {
    club: ClubDoc;
    locale: Locale;
}

export function HeroSection({ club, locale }: HeroSectionProps) {
    const image = imageUrl(club.image);
    return (
        <Section className="relative bg-gradient-to-br from-[#231F20] to-black text-white min-h-[60vh] flex items-center">
            {image && (
                <div className="absolute inset-0 opacity-30">
                    <Image
                        src={image}
                        alt={club.name}
                        fill
                        className="object-cover"
                    />
                </div>
            )}
            <div className="relative z-10 max-w-4xl mx-auto text-center">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-6xl font-heading mb-6 bg-gradient-to-r from-[#FFF33B] via-[#F3903F] to-[#E93E3A] text-transparent bg-clip-text"
                >
                    {club.name}
                </motion.h1>
                {club.shortDescription && (
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl mb-8"
                    >
                        {club.shortDescription}
                    </motion.p>
                )}
                <div className="flex flex-wrap justify-center gap-6 text-neutral-200">
                    {club.location && (
                        <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-[#F3903F]" />
                            {club.location}
                        </div>
                    )}
                    {club.members != null && (
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-[#F3903F]" />
                            {club.members} {copy[locale].members}
                        </div>
                    )}
                    {club.meetingSchedule && (
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-[#F3903F]" />
                            {club.meetingSchedule}
                        </div>
                    )}
                </div>
            </div>
        </Section>
    );
} 