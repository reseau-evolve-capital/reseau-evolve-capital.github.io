'use client';

import { motion } from 'framer-motion';
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';
import { useRouter, useSearchParams } from 'next/navigation';
import type { MediaResourcesSection } from '@/lib/content-types';
import { imageUrl } from '@/lib/media';
import type { SectionProps } from './components';
import Image from 'next/image';
import { Play, Newspaper, Headphones, ArrowUpRight } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ResourceCardProps {
    type: 'article' | 'video' | 'podcast';
    title: string;
    description: string | null;
    image: string | null;
    duration?: string | null;
    date: string | null;
    link: string | null;
    featured?: boolean | null;
    index: number;
}

const ResourceCard = ({
    type,
    title,
    description,
    image,
    duration,
    date,
    link,
    featured = false,
    index
}: ResourceCardProps) => {
    const [isHovered, setIsHovered] = useState(false);

    const TypeIcon = {
        article: Newspaper,
        video: Play,
        podcast: Headphones
    }[type];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className={`group relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${featured ? 'md:col-span-2 md:row-span-2' : ''
                }`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={`relative ${featured ? 'h-80' : 'h-48'}`}>
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                {/* Type Badge */}
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 rounded-full px-3 py-1.5">
                    <TypeIcon className="w-4 h-4" />
                    <span className="text-sm font-medium capitalize">{type}</span>
                </div>

                {/* Duration Badge */}
                {duration && (
                    <div className="absolute top-4 right-4 bg-black/50 text-white rounded-full px-3 py-1 text-sm">
                        {duration}
                    </div>
                )}
            </div>

            <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className={`font-heading mb-2 ${featured ? 'text-2xl' : 'text-xl'}`}>
                            {title}
                        </h3>
                        {description && <p className="text-neutral-600 mb-4 line-clamp-2">{description}</p>}
                    </div>
                    <motion.div
                        initial={false}
                        animate={{ rotate: isHovered ? 45 : 0 }}
                        className="flex-shrink-0 p-2 rounded-full bg-neutral-100 group-hover:bg-[#F3903F] group-hover:text-white transition-colors"
                    >
                        <ArrowUpRight className="w-4 h-4" />
                    </motion.div>
                </div>

                {date && (
                    <div className="text-sm text-neutral-500">
                        {date}
                    </div>
                )}
            </div>

            {link && (
                <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0"
                    aria-label={title}
                />
            )}
        </motion.div>
    );
};

export function MediaResources({ data: content, ctx }: SectionProps<MediaResourcesSection>) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { locale } = ctx;
    const filters = {
        all: content.filterAll,
        article: content.filterArticle,
        video: content.filterVideo,
        podcast: content.filterPodcast,
    };
    
    // Get the activeResource from URL query params or default to 'all'
    const defaultActiveType = (() => {
        const paramType = searchParams.get('activeResource');
        if (paramType && ['all', 'article', 'video', 'podcast'].includes(paramType)) {
            return paramType as 'all' | 'article' | 'video' | 'podcast';
        }
        return 'all';
    })();
    
    const [activeType, setActiveType] = useState<'all' | 'article' | 'video' | 'podcast'>(defaultActiveType);

    // Update activeType if URL query param changes
    useEffect(() => {
        const paramType = searchParams.get('activeResource');
        if (paramType && ['all', 'article', 'video', 'podcast'].includes(paramType)) {
            setActiveType(paramType as 'all' | 'article' | 'video' | 'podcast');
        }
    }, [searchParams]);

    const filteredResources = content.resources.filter((resource) => {
        if (activeType === 'all') return true;
        return resource.type === activeType;
    });

    const handleTypeChange = (type: 'all' | 'article' | 'video' | 'podcast') => {
        setActiveType(type);
        
        // Update URL with the new activeResource parameter without page reload
        const url = new URL(window.location.href);
        url.searchParams.set('activeResource', type);
        window.history.pushState({}, '', url);
    };

    return (
        <Section>
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
                {(['all', 'article', 'video', 'podcast'] as const).filter((type) => filters[type]).map((type) => (
                    <Button
                        key={type}
                        variant={activeType === type ? 'default' : 'ghost'}
                        onClick={() => handleTypeChange(type)}
                        size="sm"
                        className="capitalize"
                    >
                        {filters[type]}
                    </Button>
                ))}
            </div>

            {/* Bento Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {filteredResources.map((resource, index) => (
                    <ResourceCard
                        key={`${resource.title}-${index}`}
                        type={resource.type}
                        title={resource.title}
                        description={resource.description}
                        image={imageUrl(resource.image)}
                        duration={resource.duration}
                        date={resource.date}
                        link={resource.link}
                        featured={resource.featured}
                        index={index}
                    />
                ))}
            </div>

            {/* CTA Section */}
            {content.ctaLabel && (
                <div className="text-center">
                    <Button
                        onClick={() => router.push(`/${locale}/#resources`)}
                        size="lg"
                    >
                        {content.ctaLabel}
                    </Button>
                </div>
            )}
        </Section>
    );
} 