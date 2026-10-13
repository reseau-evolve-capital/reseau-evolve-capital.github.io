'use client';

import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import type { ContactInfoSection as ContactInfoSectionData } from '@/lib/content-types';
import type { SectionProps } from '@/components/sections/components';
import { copy } from '@/lib/copy';
import { Mail, Phone, MapPin, Linkedin, Twitter, Facebook, Instagram } from 'lucide-react';

export function ContactInfoSection({ ctx }: SectionProps<ContactInfoSectionData>) {
    const { global, locale } = ctx;
    const t = copy[locale];
    const hasInfo = Boolean(global.contactEmail || global.contactPhone || global.contactAddress);
    const hasSocial = Boolean(global.linkedin || global.twitter || global.facebook || global.instagram);

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
                            {global.contactAddress && (
                                <div className="flex items-center gap-4 text-neutral-600">
                                    <MapPin className="w-6 h-6 text-[#F3903F] flex-shrink-0" />
                                    {global.contactAddress}
                                </div>
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
                            {global.linkedin && (
                                <a
                                    href={global.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-neutral-600 hover:text-[#0077b5] transition-colors"
                                >
                                    <Linkedin className="w-6 h-6" />
                                    <span>LinkedIn</span>
                                </a>
                            )}
                            {global.twitter && (
                                <a
                                    href={global.twitter}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-neutral-600 hover:text-[#1DA1F2] transition-colors"
                                >
                                    <Twitter className="w-6 h-6" />
                                    <span>Twitter</span>
                                </a>
                            )}
                            {global.facebook && (
                                <a
                                    href={global.facebook}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-neutral-600 hover:text-[#4267B2] transition-colors"
                                >
                                    <Facebook className="w-6 h-6" />
                                    <span>Facebook</span>
                                </a>
                            )}
                            {global.instagram && (
                                <a
                                    href={global.instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-neutral-600 hover:text-[#E1306C] transition-colors"
                                >
                                    <Instagram className="w-6 h-6" />
                                    <span>Instagram</span>
                                </a>
                            )}
                        </div>
                    </motion.div>
                    )}
                </div>
            </div>
        </Section>
    );
} 