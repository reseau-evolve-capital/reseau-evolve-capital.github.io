'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { type Locale } from '@/config/site-config';
import { aboutUsContent } from '@/config/about-us-config';
import { ArrowRight } from 'lucide-react';

interface JoinSectionProps {
    locale: Locale;
}

export function JoinSection({ locale }: JoinSectionProps) {
    const { join } = aboutUsContent;

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
                        {join.title[locale]}
                    </h2>
                    <p className="text-xl text-neutral-600">
                        {join.content[locale]}
                    </p>
                </motion.div>

                {/* Benefits */}
                <div className="grid md:grid-cols-3 gap-8 mb-16">
                    {join.benefits.list.map((benefit, index) => (
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
                                    src={benefit.icon}
                                    alt={benefit.title[locale]}
                                    width={48}
                                    height={48}
                                />
                            </div>
                            <h3 className="font-heading text-xl mb-2">
                                {benefit.title[locale]}
                            </h3>
                            <p className="text-neutral-600">
                                {benefit.description[locale]}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Testimonials */}
                {join.testimonials.length > 0 && (
                    <div className="mb-16">
                        <div className="grid md:grid-cols-2 gap-8">
                            {join.testimonials.map((testimonial, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-neutral-50 rounded-xl p-6"
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="relative w-12 h-12">
                                            <Image
                                                src={testimonial.image}
                                                alt={testimonial.author}
                                                fill
                                                className="object-cover rounded-full"
                                            />
                                        </div>
                                        <div>
                                            <h4 className="font-heading">{testimonial.author}</h4>
                                            <p className="text-sm text-neutral-600">
                                                {testimonial.role[locale]} - {testimonial.clubName[locale]}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-neutral-600 italic">
                                        {testimonial.quote[locale]}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center"
                >
                    <Button
                        size="lg"
                        className="group"
                    >
                        <a href={join.cta.href}>
                            {join.cta.label[locale]}
                            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                        </a>
                    </Button>
                </motion.div>
            </div>
        </Section>
    );
} 