'use client';

import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import type { ContactInfoSection as ContactInfoSectionData } from '@/lib/content-types';
import type { SectionProps } from '@/components/sections/components';
import { copy } from '@/lib/copy';
import { Mail, Phone } from 'lucide-react';
import { SocialLinks, getSocialLinks } from '@/components/ui/SocialLinks';

export function ContactInfoSection({ ctx }: SectionProps<ContactInfoSectionData>) {
    const { locale } = ctx;
    const global = ctx.contact ?? {};
    const t = copy[locale];
    const hasInfo = Boolean(global.contactEmail || global.contactPhone);
    const socials = getSocialLinks(global);
    const hasSocial = socials.length > 0;

    if (!hasInfo && !hasSocial) return null;

    return (
        <Section className="bg-neutral-50">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-4xl font-heading mb-4">
                        {t.getInTouch}
                    </h2>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-12">
                    {/* Contact Info */}
                    {hasInfo && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="space-y-6"
                        >
                            <h3 className="text-2xl font-heading mb-6">
                                {t.contactDetails}
                            </h3>
                            {global.contactEmail && (
                                <a
                                    href={`mailto:${global.contactEmail}`}
                                    className="flex items-center gap-4 text-neutral-600 hover:text-[#F3903F] transition-colors"
                                >
                                    <Mail className="w-6 h-6 text-[#F3903F]" />
                                    {global.contactEmail}
                                </a>
                            )}
                            {global.contactPhone && (
                                <a
                                    href={`tel:${global.contactPhone}`}
                                    className="flex items-center gap-4 text-neutral-600 hover:text-[#F3903F] transition-colors"
                                >
                                    <Phone className="w-6 h-6 text-[#F3903F]" />
                                    {global.contactPhone}
                                </a>
                            )}
                        </motion.div>
                    )}

                    {/* Social Links */}
                    {hasSocial && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <h3 className="text-2xl font-heading mb-6">
                            {t.socialMedia}
                        </h3>
                        <p className="text-neutral-600 mb-6">
                            {t.socialText}
                        </p>
                        <div className="flex flex-wrap gap-6">
                            <SocialLinks links={socials} variant="labeled" />
                        </div>
                    </motion.div>
                    )}
                </div>
            </div>
        </Section>
    );
} 