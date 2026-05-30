'use client';

import { motion } from 'framer-motion';
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';
import { useRouter } from 'next/navigation';
import { type Locale } from '@/config/site-config';
import { pageContent } from '@/config/site-config';
import Image from 'next/image';
import { useState } from 'react';
import { Building2, Handshake, Mail } from 'lucide-react';

interface PartnerLogoProps {
    name: string;
    logo: string;
    type: string;
    index: number;
}

const PartnerLogo = ({ name, logo, type, index }: PartnerLogoProps) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative h-20 bg-white rounded-xl shadow-sm p-4 transition-all duration-300 hover:shadow-lg">
                <Image
                    src={logo}
                    alt={name}
                    fill
                    className="object-contain p-4 transition-opacity grayscale hover:grayscale-0"
                />
            </div>
            {isHovered && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 whitespace-nowrap z-10">
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-xs text-neutral-500">{type}</p>
                </div>
            )}
        </motion.div>
    );
};

interface SponsorshipTierProps {
    title: string;
    description: string;
    benefits: string[];
    icon: React.ReactNode;
    index: number;
}

const SponsorshipTier = ({ title, description, benefits, icon, index }: SponsorshipTierProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.1 }}
        className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
    >
        <div className="w-12 h-12 bg-gradient-to-br from-[#FFF33B] to-[#F3903F] rounded-xl flex items-center justify-center mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-heading mb-2">{title}</h3>
        <p className="text-neutral-600 mb-4">{description}</p>
        <ul className="space-y-2">
            {benefits.map((benefit, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-neutral-600">
                    <span className="w-1.5 h-1.5 bg-[#F3903F] rounded-full" />
                    {benefit}
                </li>
            ))}
        </ul>
    </motion.div>
);

interface PartnershipsProps {
    locale: Locale;
}

export function Partnerships({ locale }: PartnershipsProps) {
    const router = useRouter();
    const content = pageContent.home.partnerships;
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Section>
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

            {/* Current Partners Grid */}
            <div className="mb-20">
                <h3 className="text-2xl font-heading text-center mb-8">
                    {content.partnersTitle[locale]}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {content.partners.map((partner, index) => (
                        <PartnerLogo
                            key={partner.name[locale]}
                            name={partner.name[locale]}
                            logo={partner.logo}
                            type={partner.type[locale]}
                            index={index}
                        />
                    ))}
                </div>
            </div>

            {/* Sponsorship Tiers */}
            <div className="mb-20">
                <h3 className="text-2xl font-heading text-center mb-8">
                    {content.sponsorshipTitle[locale]}
                </h3>
                <div className="grid md:grid-cols-3 gap-8">
                    {content.sponsorshipTiers.map((tier, index) => (
                        <SponsorshipTier
                            key={tier.title[locale]}
                            title={tier.title[locale]}
                            description={tier.description[locale]}
                            benefits={tier.benefits.map(b => b[locale])}
                            icon={
                                <div className="text-white w-6 h-6">
                                    {index === 0 ? <Building2 /> : index === 1 ? <Handshake /> : <Mail />}
                                </div>
                            }
                            index={index}
                        />
                    ))}
                </div>
            </div>

            {/* CTA Section */}
            <div className="text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-gradient-to-br from-[#FFF33B] to-[#F3903F] rounded-2xl p-8 md:p-12"
                >
                    {/* CTA Section 
                    <h3 className="text-2xl md:text-3xl font-heading text-white mb-4">
                        {content.ctaTitle[locale]}
                    </h3>
                    <p className="text-white/90 mb-8 max-w-2xl mx-auto">
                        {content.ctaDescription[locale]}
                    </p>
                    */}
                    <Button
                        onClick={() => router.push(`/${locale}/contact`)}
                        size="lg"
                        variant="secondary"
                        className="group"
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                    >
                        {content.cta[locale]}
                        <motion.span
                            className="inline-block ml-2"
                            animate={{ x: isHovered ? 5 : 0 }}
                        >
                            →
                        </motion.span>
                    </Button>
                </motion.div>
            </div>
        </Section>
    );
} 