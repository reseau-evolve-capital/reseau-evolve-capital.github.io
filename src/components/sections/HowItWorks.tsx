'use client';

import { motion } from 'framer-motion';
import { Section } from '../ui/Section';
import { pageContent } from '@/config/site-config';
import { type Locale } from '@/config/site-config';
import Image from 'next/image';

interface StepProps {
    step: number;
    title: string;
    description: string;
    icon: string;
    index: number;
}

const Step = ({ step, title, description, icon, index }: StepProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.2 }}
        className="relative flex items-start gap-4 bg-white p-6 rounded-xl shadow-lg"
    >
        <div className="absolute -left-3 top-6 w-6 h-6 bg-gradient-to-br from-[#FFF33B] to-[#F3903F] rounded-full flex items-center justify-center text-white font-bold text-sm">
            {step}
        </div>
        <div className="w-12 h-12 flex-shrink-0 bg-neutral-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl">{icon}</span>
        </div>
        <div>
            <h3 className="text-xl font-heading mb-2">{title}</h3>
            <p className="text-neutral-600">{description}</p>
        </div>
    </motion.div>
);

interface HowItWorksProps {
    locale: Locale;
}

export function HowItWorks({ locale }: HowItWorksProps) {
    const content = pageContent.home.howItWorks;


    return (
        <Section className="bg-neutral-50">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-4xl font-heading mb-6"
                    >
                        {content.title[locale]}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-neutral-600"
                    >
                        {content.description[locale]}
                    </motion.p>
                </div>

                <div className="relative">
                    {/* Connection Line */}
                    <div className="absolute left-[2.25rem] top-0 bottom-0 w-px bg-gradient-to-b from-[#FFF33B] to-[#F3903F] z-0" />

                    {/* Steps */}
                    <div className="relative z-10 space-y-8">
                        {content.steps.map((step, index) => (
                            <Step
                                key={step.title[locale]}
                                step={index + 1}
                                title={step.title[locale]}
                                description={step.description[locale]}
                                icon={step.icon}
                                index={index}
                            />
                        ))}
                    </div>
                </div>

                {/* Video or Infographic */}
                {content.video && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 }}
                        className="mt-16 rounded-2xl overflow-hidden aspect-video relative"
                    >
                        <Image
                            src={content.video.thumbnail}
                            alt={content.video.title[locale]}
                            fill
                            className="object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <button className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center">
                                <span className="text-2xl">▶️</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </Section>
    );
} 