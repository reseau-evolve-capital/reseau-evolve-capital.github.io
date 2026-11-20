'use client';

import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import type { ClubDoc, Locale } from '@/lib/content-types';
import { copy } from '@/lib/copy';

interface StorySectionProps {
    club: ClubDoc;
    locale: Locale;
}

export function StorySection({ club, locale }: StorySectionProps) {
    const { story } = club;
    if (!story || (!story.origins && story.milestones.length === 0 && !story.futureVision)) return null;
    const t = copy[locale];
    return (
        <Section className="bg-neutral-50">
            <div className="max-w-4xl mx-auto">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl font-heading text-center mb-12"
                >
                    {t.storyTitle}
                </motion.h2>
                <motion.div className="grid md:grid-cols-3 gap-8">
                    {story.origins && (
                        <div className="space-y-4">
                            <h3 className="text-2xl font-heading">
                                {t.storyOrigins}
                            </h3>
                            <p className="text-neutral-600">{story.origins}</p>
                        </div>
                    )}
                    {story.milestones.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-2xl font-heading">
                                {t.storyMilestones}
                            </h3>
                            <div className="space-y-3">
                                {story.milestones.map((milestone, index) => (
                                    <div key={index} className="flex gap-4">
                                        <div className="font-bold text-orange-500 min-w-16">{milestone.title}</div>
                                        {milestone.content && <p className="text-neutral-600">{milestone.content}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {story.futureVision && (
                        <div className="space-y-4">
                            <h3 className="text-2xl font-heading">
                                {t.storyVision}
                            </h3>
                            <p className="text-neutral-600">{story.futureVision}</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </Section>
    );
} 