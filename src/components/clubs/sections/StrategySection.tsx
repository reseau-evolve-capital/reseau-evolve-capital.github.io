'use client';

import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import { type Club, type Locale } from '@/config/site-config';
import { siteConfig } from '@/config/site-config';
import { Target, Shield, LineChart } from 'lucide-react';

interface StrategySectionProps {
    club: Club;
    locale: Locale;
}

export function StrategySection({ club, locale }: StrategySectionProps) {
    return (
        <Section>
            <div className="max-w-4xl mx-auto">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl font-heading text-center mb-12"
                >
                    {siteConfig.sectionTitles.strategy.title[locale]}
                </motion.h2>
                <div className="grid md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                        {/* Focus Areas */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="flex gap-4"
                        >
                            <div className="w-12 h-12 rounded-xl bg-[#FFF33B]/10 flex items-center justify-center flex-shrink-0">
                                <Target className="w-6 h-6 text-[#FFF33B]" />
                            </div>
                            <div>
                                <h3 className="font-heading text-xl mb-2">{siteConfig.sectionTitles.strategy.focusAreas[locale]}</h3>
                                <p className="text-neutral-600">{club.investmentStrategy.focusAreas[locale]}</p>
                            </div>
                        </motion.div>

                        {/* Risk Profile */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="flex gap-4"
                        >
                            <div className="w-12 h-12 rounded-xl bg-[#F3903F]/10 flex items-center justify-center flex-shrink-0">
                                <Shield className="w-6 h-6 text-[#F3903F]" />
                            </div>
                            <div>
                                <h3 className="font-heading text-xl mb-2">{siteConfig.sectionTitles.strategy.riskProfile[locale]}</h3>
                                <p className="text-neutral-600">{club.investmentStrategy.riskProfile[locale]}</p>
                            </div>
                        </motion.div>

                        {/* Decision Process */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="flex gap-4"
                        >
                            <div className="w-12 h-12 rounded-xl bg-[#E93E3A]/10 flex items-center justify-center flex-shrink-0">
                                <LineChart className="w-6 h-6 text-[#E93E3A]" />
                            </div>
                            <div>
                                <h3 className="font-heading text-xl mb-2">{siteConfig.sectionTitles.strategy.decisionProcess[locale]}</h3>
                                <p className="text-neutral-600">{club.investmentStrategy.decisionProcess[locale]}</p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Investment Requirements */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-white rounded-2xl shadow-lg p-8"
                    >
                        <h3 className="text-2xl font-heading mb-8">{siteConfig.sectionTitles.strategy.investmentRequirements[locale]}</h3>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center pb-4 border-b">
                                <span className="text-neutral-600">{siteConfig.sectionTitles.strategy.minimumInvestment[locale]}</span>
                                <span className="font-heading text-xl">
                                    €{club.investmentStrategy.minimumInvestment.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pb-4 border-b">
                                <span className="text-neutral-600">{siteConfig.sectionTitles.strategy.monthlyContribution[locale]}</span>
                                <span className="font-heading text-xl">
                                    €{club.investmentStrategy.monthlyContribution.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </Section>
    );
} 