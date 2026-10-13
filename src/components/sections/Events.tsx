'use client';

import { motion } from 'framer-motion';
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';
import { useRouter } from 'next/navigation';
import type { EventsSection, Locale } from '@/lib/content-types';
import { imageUrl } from '@/lib/media';
import { copy } from '@/lib/copy';
import type { SectionProps } from './components';
import Image from 'next/image';
import { Calendar, Clock, MapPin, Users, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';

interface EventCardProps {
    title: string;
    description: string | null;
    date: string | null;
    time: string | null;
    location: string | null;
    image: string | null;
    capacity: number | null;
    registeredCount: number | null;
    isPast: boolean;
    tags: string[];
    link: string | null;
    index: number;
    locale: Locale;
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
    index,
    locale
}: EventCardProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        // This code will only run on the client side
        setIsClient(true);
    }, []);

    const handleButtonClick = () => {
        if (link && isClient && typeof window !== 'undefined') {
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
                {image && (
                    <Image
                        src={image}
                        alt={title}
                        fill
                        className="object-cover transition-transform duration-300"
                        style={{
                            transform: isHovered ? 'scale(1.05)' : 'scale(1)'
                        }}
                    />
                )}
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
                {description && <p className="text-neutral-600 mb-4">{description}</p>}

                <div className="space-y-2 mb-4">
                    {date && (
                        <div className="flex items-center text-sm text-neutral-500">
                            <Calendar className="w-4 h-4 mr-2" />
                            {date}
                        </div>
                    )}
                    {time && (
                        <div className="flex items-center text-sm text-neutral-500">
                            <Clock className="w-4 h-4 mr-2" />
                            {time}
                        </div>
                    )}
                    {location && (
                        <div className="flex items-center text-sm text-neutral-500">
                            <MapPin className="w-4 h-4 mr-2" />
                            {location}
                        </div>
                    )}
                    {capacity != null && capacity > 0 && (
                        <div className="flex items-center text-sm text-neutral-500">
                            <Users className="w-4 h-4 mr-2" />
                            {registeredCount ?? 0} / {capacity} {copy[locale].participants}
                        </div>
                    )}
                </div>

                {capacity != null && capacity > 0 && (
                    <div className="flex items-center justify-between">
                        <div className="w-full bg-neutral-200 rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-[#FFF33B] to-[#F3903F] h-2 rounded-full transition-all"
                                style={{
                                    width: `${((registeredCount ?? 0) / capacity) * 100}%`
                                }}
                            />
                        </div>
                    </div>
                )}

                {link && (
                    <div className="mt-4 flex justify-end">
                        <Button
                            variant={isPast ? "ghost" : "default"}
                            size="sm"
                            onClick={handleButtonClick}
                            className="group"
                        >
                            {isPast ? copy[locale].eventSummary : copy[locale].register}
                            <ExternalLink className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </div>
                )}
            </div>

            {isPast && (
                <div className="absolute top-2 right-2 px-3 py-1 bg-neutral-900/80 text-white rounded-full text-sm">
                    {copy[locale].eventPast}
                </div>
            )}
        </motion.div>
    );
};

export function Events({ data: content, ctx }: SectionProps<EventsSection>) {
    const router = useRouter();
    const { locale } = ctx;
    const filters = {
        all: content.filterAll,
        upcoming: content.filterUpcoming,
        past: content.filterPast,
    };
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

    const filteredEvents = content.events.filter((event) => {
        if (filter === 'all') return true;
        return filter === 'upcoming' ? !event.isPast : Boolean(event.isPast);
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

            {/* Filter Buttons */}
            <div className="flex justify-center gap-4 mb-12">
                {(['all', 'upcoming', 'past'] as const).filter((f) => filters[f]).map((f) => (
                    <Button
                        key={f}
                        variant={filter === f ? 'default' : 'ghost'}
                        onClick={() => setFilter(f)}
                        size="sm"
                    >
                        {filters[f]}
                    </Button>
                ))}
            </div>

            {/* Events Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {filteredEvents.map((event, index) => (
                    <EventCard
                        key={`${event.title}-${index}`}
                        title={event.title}
                        description={event.description}
                        date={event.date}
                        time={event.time}
                        location={event.location}
                        image={imageUrl(event.image)}
                        capacity={event.capacity}
                        registeredCount={event.registeredCount}
                        isPast={Boolean(event.isPast)}
                        tags={event.tags.map(tag => tag.text)}
                        link={event.link}
                        index={index}
                        locale={locale}
                    />
                ))}
            </div>

            {/* CTA Section */}
            {content.ctaLabel && (
                <div className="text-center">
                    <Button
                        onClick={() => router.push(`/${locale}/#events`)}
                        size="lg"
                    >
                        {content.ctaLabel}
                    </Button>
                </div>
            )}
        </Section>
    );
} 