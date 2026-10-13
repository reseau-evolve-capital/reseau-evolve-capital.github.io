'use client';

import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import type { MissionSection as MissionSectionData } from '@/lib/content-types';
import type { SectionProps } from '@/components/sections/components';
import Image from 'next/image';

export function MissionSection({ data: mission }: SectionProps<MissionSectionData>) {
    return (
        <Section>
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-4xl font-heading mb-4">
                        {mission.title}
                    </h2>
                    {mission.statement && (
                        <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
                            {mission.statement}
                        </p>
                    )}
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8">
                    {mission.values.map((value, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                        >
                            {value.icon && (
                                <div className="w-12 h-12 mb-4">
                                    <Image
                                        src={value.icon}
                                        alt={value.title}
                                        width={48}
                                        height={48}
                                    />
                                </div>
                            )}
                            <h3 className="font-heading text-xl mb-2">
                                {value.title}
                            </h3>
                            {value.description && (
                                <p className="text-neutral-600">
                                    {value.description}
                                </p>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </Section>
    );
}
