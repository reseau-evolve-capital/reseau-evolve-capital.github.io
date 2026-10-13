'use client';

import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import type { ClubDoc, Locale } from '@/lib/content-types';
import { copy } from '@/lib/copy';
import { Target, Shield, LineChart } from 'lucide-react';

interface StrategySectionProps {
    club: ClubDoc;
    locale: Locale;
}

export function StrategySection({ club, locale }: StrategySectionProps) {
    const strategy = club.investmentStrategy;
    const showAmounts = strategy?.minimumInvestment != null || strategy?.monthlyContribution != null;
    if (!strategy || (!strategy.focusAreas && !strategy.riskProfile && !strategy.decisionProcess && !showAmounts)) return null;
    const t = copy[locale];
    return (
        <Section>
            <div className="max-w-4xl mx-auto">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl font-heading text-center mb-12"
                >
                    {t.strategyTitle}
                </motion.h2>
                <div className="grid md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                        {/* Focus Areas */}
                        {strategy.focusAreas && (
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
                                    <h3 className="font-heading text-xl mb-2">{t.focusAreas}</h3>
                                    <p className="text-neutral-600">{strategy.focusAreas}</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Risk Profile */}
                        {strategy.riskProfile && (
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
                                    <h3 className="font-heading text-xl mb-2">{t.riskProfile}</h3>
                                    <p className="text-neutral-600">{strategy.riskProfile}</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Decision Process */}
                        {strategy.decisionProcess && (
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
                                    <h3 className="font-heading text-xl mb-2">{t.decisionProcess}</h3>
                                    <p className="text-neutral-600">{strategy.decisionProcess}</p>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Investment Requirements */}
                    {showAmounts && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="bg-white rounded-2xl shadow-lg p-8"
                        >
                            <h3 className="text-2xl font-heading mb-8">{t.investmentRequirements}</h3>
                            <div className="space-y-6">
                                {strategy.minimumInvestment != null && (
                                    <div className="flex justify-between items-center pb-4 border-b">
                                        <span className="text-neutral-600">{t.minimumInvestment}</span>
                                        <span className="font-heading text-xl">
                                            €{strategy.minimumInvestment.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                {strategy.monthlyContribution != null && (
                                    <div className="flex justify-between items-center pb-4 border-b">
                                        <span className="text-neutral-600">{t.monthlyContribution}</span>
                                        <span className="font-heading text-xl">
                                            €{strategy.monthlyContribution.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </Section>
    );
}
