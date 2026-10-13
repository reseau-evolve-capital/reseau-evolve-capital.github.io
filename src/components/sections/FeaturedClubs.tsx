'use client';

import { motion } from 'framer-motion';
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';
import { useRouter } from 'next/navigation';
import type { FeaturedClubsSection } from '@/lib/content-types';
import { imageUrl } from '@/lib/media';
import { copy } from '@/lib/copy';
import type { Locale } from '@/lib/content-types';
import type { SectionProps } from './components';
import Image from 'next/image';
import { useState } from 'react';
import { MapPin } from 'lucide-react';
//import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
//import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import DynamicMap from './DynamicMap';
//import { LocalizedText } from '@/config/site-config';

// import dynamic from "next/dynamic";

// const DynamicMap = dynamic(() => import("@/components/sections/DynamicMap"), {
//     ssr: true,
//     loading: () => <p>Loading featured clubs...</p>,
// });

// Fix for default markers

interface ClubCardProps {
    name: string;
    description: string | null;
    members: number | null;
    location: string | null;
    image: string | null;
    clubSlug: string;
    index: number;
    onHover: () => void;
    active: boolean;
    locale: Locale;
}

const ClubCard = ({ name, description, members, location, image, clubSlug, index, onHover, active, locale }: ClubCardProps) => {
    const router = useRouter();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className={`bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transition-shadow hover:shadow-xl ${active ? 'ring-2 ring-[#F3903F]' : ''}`}
            onMouseEnter={onHover}
            onClick={() => router.push(`/${locale}/clubs/${clubSlug}`)}
        >
            <div className="relative h-48">
                {image && (
                    <Image
                        src={image}
                        alt={name}
                        fill
                        className="object-cover"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-heading text-white mb-1">{name}</h3>
                    {location && (
                        <div className="flex items-center text-white/90">
                            <MapPin className="w-4 h-4 mr-1" />
                            {location}
                        </div>
                    )}
                </div>
            </div>
            <div className="p-4">
                {description && <p className="text-neutral-600 mb-4">{description}</p>}
                <div className="flex items-center justify-between">
                    {members != null && (
                        <span className="text-sm text-neutral-500">
                            {members} {copy[locale].members}
                        </span>
                    )}
                    <Button variant="ghost" size="sm">
                        {copy[locale].learnMore}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};

export default function FeaturedClubs({ data: content, ctx }: SectionProps<FeaturedClubsSection>) {
    //const router = useRouter();
    const { locale } = ctx;
    const clubs = ctx.clubs.filter((c) => c.featured);
    const [activeClub, setActiveClub] = useState<number | null>(null);
    // const [isMounted, setIsMounted] = useState(false);

    // // Handle SSR
    // useEffect(() => {
    //     setIsMounted(true);
    // }, []);

    //const franceCenter = { lat: 46.603354, lng: 1.888334 }; // Center of France

    return (
        <Section>
            <div className="text-center mb-16">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl md:text-4xl font-heading mb-6"
                >
                    {content.title}
                </motion.h2>
                {content.description && (
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-neutral-600 max-w-2xl mx-auto"
                    >
                        {content.description}
                    </motion.p>
                )}
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-start mb-12">
                {/* Map Section */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="relative aspect-[4/3] bg-neutral-100 rounded-2xl overflow-hidden"
                >
                    <DynamicMap
                        clubs={clubs}
                        activeClub={activeClub}
                        onClubClick={setActiveClub}
                    />
                </motion.div>

                {/* Clubs Grid */}
                <div className="grid sm:grid-cols-2 gap-6">
                    {clubs.map((club, index) => (
                        <ClubCard
                            key={club.slug}
                            name={club.name}
                            description={club.shortDescription}
                            members={club.members}
                            location={club.location}
                            image={imageUrl(club.image)}
                            clubSlug={club.slug}
                            index={index}
                            onHover={() => setActiveClub(index)}
                            active={activeClub === index}
                            locale={locale}
                        />
                    ))}
                </div>
            </div>

            {/* CTA Section 
            <div className="text-center">
                <Button
                    onClick={() => router.push(`/${locale}/clubs`)}
                    size="lg"
                >
                    {content.cta[locale]}
                </Button>
            </div>
            */}
        </Section>
    );
} 