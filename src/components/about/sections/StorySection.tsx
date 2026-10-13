'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Section } from '@/components/ui/Section';
import type { StorySection as StorySectionData } from '@/lib/content-types';
import { imageUrl } from '@/lib/media';
import { copy } from '@/lib/copy';
import type { SectionProps } from '@/components/sections/components';

export function StorySection({ data: story, ctx }: SectionProps<StorySectionData>) {
    const { locale } = ctx;
    const genesisImage = imageUrl(story.genesisImage);
    const hasGenesis = Boolean(story.genesisTitle || story.genesisContent || genesisImage);

    return (
        <Section className="bg-neutral-50">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-4xl font-heading mb-4">
                        {story.title}
                    </h2>
                    {story.subtitle && (
                        <p className="text-xl text-neutral-600">
                            {story.subtitle}
                        </p>
                    )}
                </motion.div>

                {/* Genesis */}
                {hasGenesis && (
                    <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            {story.genesisTitle && (
                                <h3 className="text-2xl font-heading mb-4">
                                    {story.genesisTitle}
                                </h3>
                            )}
                            {story.genesisContent && (
                                <p className="text-neutral-600">
                                    {story.genesisContent}
                                </p>
                            )}
                        </motion.div>
                        {genesisImage && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="relative aspect-video rounded-xl overflow-hidden"
                            >
                                <Image
                                    src={genesisImage}
                                    alt={story.genesisTitle ?? story.title}
                                    fill
                                    className="object-cover"
                                />
                            </motion.div>
                        )}
                    </div>
                )}

                {/* Timeline */}
                {story.timeline.length > 0 && (
                    <div className="space-y-8">
                        <h3 className="text-2xl font-heading text-center mb-8">
                            {copy[locale].ourJourney}
                        </h3>
                        {story.timeline.map((event, index) => (
                            <motion.div
                                key={`${event.title}-${index}`}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="flex gap-8"
                            >
                                <div className="w-32 flex-shrink-0 font-heading text-xl">
                                    {event.date}
                                </div>
                                <div>
                                    <h4 className="font-heading text-xl mb-2">
                                        {event.title}
                                    </h4>
                                    {event.description && (
                                        <p className="text-neutral-600">
                                            {event.description}
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </Section>
    );
}
