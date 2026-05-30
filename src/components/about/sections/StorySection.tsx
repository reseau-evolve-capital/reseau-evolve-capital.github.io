'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Section } from '@/components/ui/Section';
import { type Locale } from '@/config/site-config';
import { aboutUsContent } from '@/config/about-us-config';

interface StorySectionProps {
    locale: Locale;
}

export function StorySection({ locale }: StorySectionProps) {
    const { story } = aboutUsContent;

    return (
        <Section id="story" className="bg-neutral-50">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-4xl font-heading mb-4">
                        {story.title[locale]}
                    </h2>
                    <p className="text-xl text-neutral-600">
                        {story.subtitle[locale]}
                    </p>
                </motion.div>

                {/* Genesis */}
                <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <h3 className="text-2xl font-heading mb-4">
                            {story.genesis.title[locale]}
                        </h3>
                        <p className="text-neutral-600">
                            {story.genesis.content[locale]}
                        </p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="relative aspect-video rounded-xl overflow-hidden"
                    >
                        <Image
                            src={story.genesis.image}
                            alt={story.genesis.title[locale]}
                            fill
                            className="object-cover"
                        />
                    </motion.div>
                </div>

                {/* Timeline */}
                <div className="space-y-8">
                    <h3 className="text-2xl font-heading text-center mb-8">
                        {locale === 'fr' ? 'Notre Parcours' : 'Our Journey'}
                    </h3>
                    {story.timeline.map((event, index) => (
                        <motion.div
                            key={event.date}
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
                                    {event.title[locale]}
                                </h4>
                                <p className="text-neutral-600">
                                    {event.description[locale]}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </Section>
    );
} 