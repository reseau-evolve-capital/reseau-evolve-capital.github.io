'use client';

import { motion } from 'framer-motion';
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';
import { useRouter } from 'next/navigation';
import { type Locale } from '@/config/site-config';
import { pageContent } from '@/config/site-config';
import Image from 'next/image';
import { Play, Newspaper, Headphones, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';

interface ResourceCardProps {
    type: 'article' | 'video' | 'podcast';
    title: string;
    description: string;
    image: string;
    duration?: string;
    date: string;
    link: string;
    featured?: boolean;
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
                <Image
                    src={image}
                    alt={title}
                    fill
                    className="object-cover transition-transform duration-300"
                    style={{
                        transform: isHovered ? 'scale(1.05)' : 'scale(1)'
                    }}
                />
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
                        <p className="text-neutral-600 mb-4 line-clamp-2">{description}</p>
                    </div>
                    <motion.div
                        initial={false}
                        animate={{ rotate: isHovered ? 45 : 0 }}
                        className="flex-shrink-0 p-2 rounded-full bg-neutral-100 group-hover:bg-[#F3903F] group-hover:text-white transition-colors"
                    >
                        <ArrowUpRight className="w-4 h-4" />
                    </motion.div>
                </div>

                <div className="text-sm text-neutral-500">
                    {date}
                </div>
            </div>

            <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0"
                aria-label={title}
            />
        </motion.div>
    );
};

interface MediaResourcesProps {
    locale: Locale;
}

export function MediaResources({ locale }: MediaResourcesProps) {
    const router = useRouter();
    const content = pageContent.home.mediaResources;
    const [activeType, setActiveType] = useState<'all' | 'article' | 'video' | 'podcast'>('all');

    const filteredResources = content.resources.filter((resource) => {
        if (activeType === 'all') return true;
        return resource.type === activeType;
    });

    return (
        <Section>
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
                {['all', 'article', 'video', 'podcast'].map((type) => (
                    <Button
                        key={type}
                        variant={activeType === type ? 'default' : 'ghost'}
                        onClick={() => setActiveType(type as typeof activeType)}
                        size="sm"
                        className="capitalize"
                    >
                        {content.filters[type as 'all' | 'article' | 'video' | 'podcast'][locale]}
                    </Button>
                ))}
            </div>

            {/* Bento Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {filteredResources.map((resource, index) => (
                    <ResourceCard
                        key={resource.title[locale]}
                        type={resource.type}
                        title={resource.title[locale]}
                        description={resource.description[locale]}
                        image={resource.image}
                        duration={resource.duration?.[locale]}
                        date={resource.date[locale]}
                        link={resource.link}
                        featured={resource.featured}
                        index={index}
                    />
                ))}
            </div>

            {/* CTA Section */}
            <div className="text-center">
                <Button
                    onClick={() => router.push(`/${locale}/resources`)}
                    size="lg"
                >
                    {content.cta[locale]}
                </Button>
            </div>
        </Section>
    );
} 