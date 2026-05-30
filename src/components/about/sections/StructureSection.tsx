'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Section } from '@/components/ui/Section';
import { type Locale } from '@/config/site-config';
import { aboutUsContent } from '@/config/about-us-config';

interface StructureSectionProps {
    locale: Locale;
}

export function StructureSection({ locale }: StructureSectionProps) {
    const { structure } = aboutUsContent;

    return (
        <Section className="bg-neutral-50">
            <div className="max-w-4xl mx-auto">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl md:text-4xl font-heading text-center mb-16"
                >
                    {structure.title[locale]}
                </motion.h2>

                {/* Overview */}
                <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <h3 className="text-2xl font-heading mb-4">
                            {structure.overview.title[locale]}
                        </h3>
                        <p className="text-neutral-600">
                            {structure.overview.content[locale]}
                        </p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="relative aspect-video rounded-xl overflow-hidden"
                    >
                        <Image
                            src={structure.overview.image}
                            alt={structure.overview.title[locale]}
                            fill
                            className="object-cover"
                            objectFit="contain"
                        />
                    </motion.div>
                </div>

                {/* Governance */}
                <div className="mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-8"
                    >
                        <h3 className="text-2xl font-heading mb-4">
                            {structure.governance.title[locale]}
                        </h3>
                        <p className="text-neutral-600">
                            {structure.governance.content[locale]}
                        </p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="relative aspect-[16/9] rounded-xl overflow-hidden"
                    >
                        <Image
                            src={structure.governance.diagram}
                            alt={structure.governance.title[locale]}
                            fill
                            className="object-contain"
                        />
                    </motion.div>
                </div>

                {/* Units */}
                <div>
                    <motion.h3
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-2xl font-heading text-center mb-8"
                    >
                        {structure.units.title[locale]}
                    </motion.h3>
                    <div className="grid md:grid-cols-3 gap-8">
                        {structure.units.list.map((unit, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white rounded-xl p-6 shadow-sm"
                            >
                                <div className="w-12 h-12 mb-4">
                                    <Image
                                        src={unit.icon}
                                        alt={unit.name[locale]}
                                        width={48}
                                        height={48}
                                    />
                                </div>
                                <h4 className="font-heading text-xl mb-2">
                                    {unit.name[locale]}
                                </h4>
                                <p className="text-neutral-600">
                                    {unit.description[locale]}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </Section>
    );
} 