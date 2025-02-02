'use client';

import { motion } from 'framer-motion';
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';
import { useRouter } from 'next/navigation';
import { type Locale } from '@/config/site-config';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { pageContent } from '@/config/site-config';

interface BenefitCardProps {
    icon: string;
    title: string;
    description: string;
    index: number;
}

const BenefitCard = ({ icon, title, description, index }: BenefitCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.2 }}
        className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
    >
        <div className="w-12 h-12 bg-gradient-to-br from-[#FFF33B] to-[#F3903F] rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl">{icon}</span>
        </div>
        <h3 className="text-xl font-heading mb-3">{title}</h3>
        <p className="text-neutral-600">{description}</p>
    </motion.div>
);

interface TestimonialProps {
    content: string;
    author: string;
    role: string;
    image: string;
    active: boolean;
}

const Testimonial = ({ content, author, role, image, active }: TestimonialProps) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.9 }}
        transition={{ duration: 0.5 }}
        className={`absolute inset-0 ${active ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-2xl mx-auto">
            <div className="flex items-start gap-6">
                <div className="relative w-20 h-20 flex-shrink-0">
                    <Image
                        src={image}
                        alt={author}
                        fill
                        className="rounded-full object-cover"
                    />
                </div>
                <div>
                    <p className="text-lg text-neutral-600 mb-4 italic">{content}</p>
                    <h4 className="font-heading text-lg">{author}</h4>
                    <p className="text-neutral-500">{role}</p>
                </div>
            </div>
        </div>
    </motion.div>
);

interface ValuePropositionProps {
    locale: Locale;
}

export function ValueProposition({ locale }: ValuePropositionProps) {
    const router = useRouter();
    const content = pageContent.home.valueProposition;
    const [currentTestimonial, setCurrentTestimonial] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTestimonial((prev) =>
                prev === content.testimonials.length - 1 ? 0 : prev + 1
            );
        }, 5000);

        return () => clearInterval(timer);
    }, [content.testimonials.length]);

    return (
        <Section>
            {/* Main Value Proposition */}
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
                    className="text-lg text-neutral-600 max-w-2xl mx-auto"
                >
                    {content.description[locale]}
                </motion.p>
            </div>

            {/* Benefits Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
                {content.benefits.map((benefit, index) => (
                    <BenefitCard
                        key={benefit.title[locale]}
                        icon={benefit.icon}
                        title={benefit.title[locale]}
                        description={benefit.description[locale]}
                        index={index}
                    />
                ))}
            </div>

            {/* Testimonials Section */}
            <div className="bg-neutral-50 py-16 px-4 rounded-3xl mb-16">
                <h3 className="text-2xl md:text-3xl font-heading text-center mb-12">
                    {content.testimonialsTitle[locale]}
                </h3>
                <div className="relative h-[300px]">
                    {content.testimonials.map((testimonial, index) => (
                        <Testimonial
                            key={testimonial.author[locale]}
                            content={testimonial.content[locale]}
                            author={testimonial.author[locale]}
                            role={testimonial.role[locale]}
                            image={testimonial.image}
                            active={currentTestimonial === index}
                        />
                    ))}
                </div>
                <div className="flex justify-center gap-2 mt-8">
                    {content.testimonials.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentTestimonial(index)}
                            className={`w-3 h-3 rounded-full transition-colors ${currentTestimonial === index
                                ? 'bg-[#F3903F]'
                                : 'bg-neutral-300'
                                }`}
                        />
                    ))}
                </div>
            </div>

            {/* CTA Section */}
            <div className="text-center">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                        onClick={() => router.push(`/${locale}/clubs`)}
                        size="lg"
                    >
                        {content.findClubCTA[locale]}
                    </Button>
                    <Button
                        onClick={() => router.push(`/${locale}/create-club`)}
                        variant="outline"
                        size="lg"
                    >
                        {content.createClubCTA[locale]}
                    </Button>
                </div>
            </div>
        </Section>
    );
} 