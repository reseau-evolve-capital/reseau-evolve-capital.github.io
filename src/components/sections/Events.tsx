'use client';

import { motion } from 'framer-motion';
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';
import { useRouter } from 'next/navigation';
import { type Locale } from '@/config/site-config';
import { pageContent } from '@/config/site-config';
import Image from 'next/image';
import { Calendar, Clock, MapPin, Users, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';

interface EventCardProps {
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    image: string;
    capacity: number;
    registeredCount: number;
    isPast: boolean;
    tags: string[];
    link: string;
    index: number;
}

const EventCard = ({
    title,
    description,
    date,
    time,
    location,
    image,
    capacity,
    registeredCount,
    isPast,
    tags,
    link,
    index
}: EventCardProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        // This code will only run on the client side
        setIsClient(true);
    }, []);

    const handleButtonClick = () => {
        if (isClient && typeof window !== 'undefined') {
            window.open(link, '_blank');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: isPast ? 0.7 : 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ opacity: 1, scale: 1.02 }}
            className={`relative bg-white rounded-xl shadow-lg overflow-hidden transition-all ${isPast ? 'grayscale hover:grayscale-0' : ''
                }`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative h-48">
                <Image
                    src={image}
                    alt={title}
                    fill
                    className="object-cover transition-transform duration-300"
                    style={{
                        transform: isHovered ? 'scale(1.05)' : 'scale(1)'
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-4 left-4 flex gap-2">
                    {tags.map((tag) => (
                        <span
                            key={tag}
                            className="px-3 py-1 bg-white/90 rounded-full text-sm font-medium"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            <div className="p-6">
                <h3 className="text-xl font-heading mb-3">{title}</h3>
                <p className="text-neutral-600 mb-4">{description}</p>

                <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-neutral-500">
                        <Calendar className="w-4 h-4 mr-2" />
                        {date}
                    </div>
                    <div className="flex items-center text-sm text-neutral-500">
                        <Clock className="w-4 h-4 mr-2" />
                        {time}
                    </div>
                    <div className="flex items-center text-sm text-neutral-500">
                        <MapPin className="w-4 h-4 mr-2" />
                        {location}
                    </div>
                    <div className="flex items-center text-sm text-neutral-500">
                        <Users className="w-4 h-4 mr-2" />
                        {registeredCount} / {capacity} participants
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-[#FFF33B] to-[#F3903F] h-2 rounded-full transition-all"
                            style={{
                                width: `${(registeredCount / capacity) * 100}%`
                            }}
                        />
                    </div>
                </div>

                <div className="mt-4 flex justify-end">
                    <Button
                        variant={isPast ? "ghost" : "default"}
                        size="sm"
                        onClick={handleButtonClick}
                        className="group"
                    >
                        {isPast ? "Voir le résumé" : "S'inscrire"}
                        <ExternalLink className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </Button>
                </div>
            </div>

            {isPast && (
                <div className="absolute top-2 right-2 px-3 py-1 bg-neutral-900/80 text-white rounded-full text-sm">
                    Événement passé
                </div>
            )}
        </motion.div>
    );
};

interface EventsProps {
    locale: Locale;
}

export function Events({ locale }: EventsProps) {
    const router = useRouter();
    const content = pageContent.home.events;
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

    const filteredEvents = content.events.filter((event) => {
        if (filter === 'all') return true;
        return filter === 'upcoming' ? !event.isPast : event.isPast;
    });

    return (
        <Section className="bg-neutral-50">
            <div className="text-center mb-12">
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

            {/* Filter Buttons */}
            <div className="flex justify-center gap-4 mb-12">
                {['all', 'upcoming', 'past'].map((f) => (
                    <Button
                        key={f}
                        variant={filter === f ? 'default' : 'ghost'}
                        onClick={() => setFilter(f as typeof filter)}
                        size="sm"
                    >
                        {content.filters[f as 'all' | 'upcoming' | 'past'][locale]}
                    </Button>
                ))}
            </div>

            {/* Events Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {filteredEvents.map((event, index) => (
                    <EventCard
                        key={event.title[locale]}
                        title={event.title[locale]}
                        description={event.description[locale]}
                        date={event.date[locale]}
                        time={event.time[locale]}
                        location={event.location[locale]}
                        image={event.image}
                        capacity={event.capacity}
                        registeredCount={event.registeredCount}
                        isPast={event.isPast}
                        tags={event.tags.map(tag => tag[locale])}
                        link={event.link}
                        index={index}
                    />
                ))}
            </div>

            {/* CTA Section */}
            <div className="text-center">
                <Button
                    onClick={() => router.push(`/${locale}/events`)}
                    size="lg"
                >
                    {content.cta[locale]}
                </Button>
            </div>
        </Section>
    );
} 