'use client';

import { motion } from 'framer-motion';
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';
import { useRouter } from 'next/navigation';
import { type Locale } from '@/config/site-config';
import { pageContent } from '@/config/site-config';
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
    description: string;
    members: number;
    location: string;
    image: string;
    index: number;
    onHover: () => void;
    active: boolean;
}

const ClubCard = ({ name, description, members, location, image, index, onHover, active }: ClubCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.1 }}
        className={`bg-white rounded-xl shadow-lg overflow-hidden transition-shadow hover:shadow-xl cursor-pointer ${active ? 'ring-2 ring-[#F3903F]' : ''
            }`}
        onMouseEnter={onHover}
    >
        <div className="relative h-48">
            <Image
                src={image}
                alt={name}
                fill
                className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-xl font-heading text-white mb-1">{name}</h3>
                <div className="flex items-center text-white/90">
                    <MapPin className="w-4 h-4 mr-1" />
                    {location}
                </div>
            </div>
        </div>
        <div className="p-4">
            <p className="text-neutral-600 mb-4">{description}</p>
            <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">
                    {members} membres
                </span>
                <Button variant="ghost" size="sm">
                    En savoir plus →
                </Button>
            </div>
        </div>
    </motion.div>
);



interface FeaturedClubsProps {
    locale: Locale;
}

export default function FeaturedClubs({ locale }: FeaturedClubsProps) {
    const router = useRouter();
    const content = pageContent.home.featuredClubs;
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
                    {content.title[locale]}
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="text-lg text-neutral-600 max-w-2xl mx-auto"
                >
                    {content.description[locale]}
                </motion.p>
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
                        locale={locale}
                        clubs={content.clubs}
                        activeClub={activeClub}
                        onClubClick={setActiveClub}
                    />
                </motion.div>

                {/* Clubs Grid */}
                <div className="grid sm:grid-cols-2 gap-6">
                    {content.clubs.map((club, index) => (
                        <ClubCard
                            key={club.name[locale]}
                            name={club.name[locale]}
                            description={club.description[locale]}
                            members={club.members}
                            location={club.location[locale]}
                            image={club.image}
                            index={index}
                            onHover={() => setActiveClub(index)}
                            active={activeClub === index}
                        />
                    ))}
                </div>
            </div>

            {/* CTA Section */}
            <div className="text-center">
                <Button
                    onClick={() => router.push(`/${locale}/clubs`)}
                    size="lg"
                >
                    {content.cta[locale]}
                </Button>
            </div>
        </Section>
    );
} 