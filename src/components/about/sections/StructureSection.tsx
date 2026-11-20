'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Section } from '@/components/ui/Section';
import type { StructureSection as StructureSectionData } from '@/lib/content-types';
import { imageUrl } from '@/lib/media';
import type { SectionProps } from '@/components/sections/components';

export function StructureSection({ data: structure }: SectionProps<StructureSectionData>) {
    const overviewImage = imageUrl(structure.overviewImage);
    const governanceDiagram = imageUrl(structure.governanceDiagram);
    const hasOverview = Boolean(structure.overviewTitle || structure.overviewContent || overviewImage);
    const hasGovernance = Boolean(structure.governanceTitle || structure.governanceContent || governanceDiagram);

    return (
        <Section className="bg-neutral-50">
            <div className="max-w-4xl mx-auto">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl md:text-4xl font-heading text-center mb-16"
                >
                    {structure.title}
                </motion.h2>

                {/* Overview */}
                {hasOverview && (
                    <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            {structure.overviewTitle && (
                                <h3 className="text-2xl font-heading mb-4">
                                    {structure.overviewTitle}
                                </h3>
                            )}
                            {structure.overviewContent && (
                                <p className="text-neutral-600">
                                    {structure.overviewContent}
                                </p>
                            )}
                        </motion.div>
                        {overviewImage && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="relative aspect-video rounded-xl overflow-hidden"
                            >
                                <Image
                                    src={overviewImage}
                                    alt={structure.overviewTitle ?? structure.title}
                                    fill
                                    className="object-cover"
                                    objectFit="contain"
                                />
                            </motion.div>
                        )}
                    </div>
                )}

                {/* Governance */}
                {hasGovernance && (
                    <div className="mb-16">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-center mb-8"
                        >
                            {structure.governanceTitle && (
                                <h3 className="text-2xl font-heading mb-4">
                                    {structure.governanceTitle}
                                </h3>
                            )}
                            {structure.governanceContent && (
                                <p className="text-neutral-600">
                                    {structure.governanceContent}
                                </p>
                            )}
                        </motion.div>
                        {governanceDiagram && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                className="relative aspect-[16/9] rounded-xl overflow-hidden"
                            >
                                <Image
                                    src={governanceDiagram}
                                    alt={structure.governanceTitle ?? structure.title}
                                    fill
                                    className="object-contain"
                                />
                            </motion.div>
                        )}
                    </div>
                )}

                {/* Units */}
                {structure.units.length > 0 && (
                    <div>
                        {structure.unitsTitle && (
                            <motion.h3
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="text-2xl font-heading text-center mb-8"
                            >
                                {structure.unitsTitle}
                            </motion.h3>
                        )}
                        <div className="grid md:grid-cols-3 gap-8">
                            {structure.units.map((unit, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-white rounded-xl p-6 shadow-sm"
                                >
                                    {unit.icon && (
                                        <div className="w-12 h-12 mb-4">
                                            <Image
                                                src={unit.icon}
                                                alt={unit.title}
                                                width={48}
                                                height={48}
                                            />
                                        </div>
                                    )}
                                    <h4 className="font-heading text-xl mb-2">
                                        {unit.title}
                                    </h4>
                                    {unit.description && (
                                        <p className="text-neutral-600">
                                            {unit.description}
                                        </p>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Section>
    );
}
