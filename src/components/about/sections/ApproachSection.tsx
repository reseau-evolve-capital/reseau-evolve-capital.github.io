'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Section } from '@/components/ui/Section';
import { type Locale } from '@/config/site-config';
import { aboutUsContent } from '@/config/about-us-config';

interface ApproachSectionProps {
    locale: Locale;
}

export function ApproachSection({ locale }: ApproachSectionProps) {
    const { approach } = aboutUsContent;

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
                        {approach.title[locale]}
                    </h2>
                    <p className="text-xl text-neutral-600">
                        {approach.description[locale]}
                    </p>
                </motion.div>

                {/* Education */}
                <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <h3 className="text-2xl font-heading mb-4">
                            {approach.education.title[locale]}
                        </h3>
                        <p className="text-neutral-600 mb-6">
                            {approach.education.content[locale]}
                        </p>
                        <div className="space-y-4">
                            {approach.education.features.map((feature, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-start gap-4"
                                >
                                    <div className="w-8 h-8 flex-shrink-0">
                                        <Image
                                            src={feature.icon}
                                            alt={feature.title[locale]}
                                            width={32}
                                            height={32}
                                        />
                                    </div>
                                    <div>
                                        <h4 className="font-heading text-lg mb-1">
                                            {feature.title[locale]}
                                        </h4>
                                        <p className="text-sm text-neutral-600">
                                            {feature.description[locale]}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                    {/* <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="relative aspect-video rounded-xl overflow-hidden"
                    >
                        <Image
                            src={approach.education.image}
                            alt={approach.education.title[locale]}
                            fill
                            className="object-cover"
                        />
                    </motion.div> */}
                </div>

                {/* Investment Philosophy */}
                <div className="bg-neutral-50 rounded-2xl p-8 md:p-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h3 className="text-2xl font-heading mb-4">
                            {approach.investment.title[locale]}
                        </h3>
                        <p className="text-neutral-600 max-w-2xl mx-auto">
                            {approach.investment.content[locale]}
                        </p>
                    </motion.div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {approach.investment.principles.map((principle, index) => (
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
                                        src={principle.icon}
                                        alt={principle.title[locale]}
                                        width={48}
                                        height={48}
                                    />
                                </div>
                                <h4 className="font-heading text-xl mb-2">
                                    {principle.title[locale]}
                                </h4>
                                <p className="text-neutral-600">
                                    {principle.description[locale]}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </Section>
    );
} 