'use client';

import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import { type Club, type Locale } from '@/config/site-config';
import { siteConfig } from '@/config/site-config';

interface StorySectionProps {
    club: Club;
    locale: Locale;
}

export function StorySection({ club, locale }: StorySectionProps) {
    return (
        <Section className="bg-neutral-50">
            <div className="max-w-4xl mx-auto">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl font-heading text-center mb-12"
                >
                    {siteConfig.sectionTitles.story.title[locale]}
                </motion.h2>
                <motion.div className="grid md:grid-cols-3 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-2xl font-heading">
                            {siteConfig.sectionTitles.story.origins[locale]}
                        </h3>
                        <p className="text-neutral-600">{club.story.origins[locale]}</p>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-2xl font-heading">
                            {siteConfig.sectionTitles.story.milestones[locale]}
                        </h3>
                        <div className="space-y-3">
                            {Array.isArray(club.story.milestones) ? (
                                club.story.milestones.map((milestone, index) => (
                                    <div key={index} className="flex gap-4">
                                        <div className="font-bold text-orange-500 min-w-16">{milestone.title[locale]}</div>
                                        <p className="text-neutral-600">{milestone.content[locale]}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-neutral-600">{club.story.milestones[locale]}</p>
                            )}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-2xl font-heading">
                            {siteConfig.sectionTitles.story.vision[locale]}
                        </h3>
                        <p className="text-neutral-600">{club.story.futureVision[locale]}</p>
                    </div>
                </motion.div>
            </div>
        </Section>
    );
} 