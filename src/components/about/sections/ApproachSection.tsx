'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Section } from '@/components/ui/Section';
import type { ApproachSection as ApproachSectionData } from '@/lib/content-types';
import type { SectionProps } from '@/components/sections/components';

export function ApproachSection({ data: approach }: SectionProps<ApproachSectionData>) {
    const hasEducation = Boolean(
        approach.educationTitle || approach.educationContent || approach.educationFeatures.length > 0
    );
    const hasInvestment = Boolean(
        approach.investmentTitle || approach.investmentContent || approach.investmentPrinciples.length > 0
    );

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
                        {approach.title}
                    </h2>
                    {approach.description && (
                        <p className="text-xl text-neutral-600">
                            {approach.description}
                        </p>
                    )}
                </motion.div>

                {/* Education */}
                {hasEducation && (
                    <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            {approach.educationTitle && (
                                <h3 className="text-2xl font-heading mb-4">
                                    {approach.educationTitle}
                                </h3>
                            )}
                            {approach.educationContent && (
                                <p className="text-neutral-600 mb-6">
                                    {approach.educationContent}
                                </p>
                            )}
                            {approach.educationFeatures.length > 0 && (
                                <div className="space-y-4">
                                    {approach.educationFeatures.map((feature, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, x: -20 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: index * 0.1 }}
                                            className="flex items-start gap-4"
                                        >
                                            {feature.icon && (
                                                <div className="w-8 h-8 flex-shrink-0">
                                                    <Image
                                                        src={feature.icon}
                                                        alt={feature.title}
                                                        width={32}
                                                        height={32}
                                                    />
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="font-heading text-lg mb-1">
                                                    {feature.title}
                                                </h4>
                                                {feature.description && (
                                                    <p className="text-sm text-neutral-600">
                                                        {feature.description}
                                                    </p>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}

                {/* Investment Philosophy */}
                {hasInvestment && (
                    <div className="bg-neutral-50 rounded-2xl p-8 md:p-12">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-center mb-12"
                        >
                            {approach.investmentTitle && (
                                <h3 className="text-2xl font-heading mb-4">
                                    {approach.investmentTitle}
                                </h3>
                            )}
                            {approach.investmentContent && (
                                <p className="text-neutral-600 max-w-2xl mx-auto">
                                    {approach.investmentContent}
                                </p>
                            )}
                        </motion.div>
                        {approach.investmentPrinciples.length > 0 && (
                            <div className="grid md:grid-cols-3 gap-8">
                                {approach.investmentPrinciples.map((principle, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.1 }}
                                        className="bg-white rounded-xl p-6 shadow-sm"
                                    >
                                        {principle.icon && (
                                            <div className="w-12 h-12 mb-4">
                                                <Image
                                                    src={principle.icon}
                                                    alt={principle.title}
                                                    width={48}
                                                    height={48}
                                                />
                                            </div>
                                        )}
                                        <h4 className="font-heading text-xl mb-2">
                                            {principle.title}
                                        </h4>
                                        {principle.description && (
                                            <p className="text-neutral-600">
                                                {principle.description}
                                            </p>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Section>
    );
}
