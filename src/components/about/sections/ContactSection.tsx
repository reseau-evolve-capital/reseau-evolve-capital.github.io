'use client';

import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import type { ContactIntroSection } from '@/lib/content-types';
import type { SectionProps } from '@/components/sections/components';
import { Mail, Phone, MapPin, Linkedin, Twitter, Facebook, Instagram } from 'lucide-react';

export function ContactSection({ data: contact, ctx }: SectionProps<ContactIntroSection>) {
    const global = ctx.contact ?? {};
    const hasInfo = Boolean(global.contactEmail || global.contactPhone || global.contactAddress);
    const hasSocial = Boolean(global.linkedin || global.twitter || global.facebook || global.instagram);

    return (
        <Section className="bg-gradient-to-br from-[#231F20] to-black text-white">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-4xl font-heading mb-4">
                        {contact.title}
                    </h2>
                    {contact.content && (
                        <p className="text-xl text-neutral-300">
                            {contact.content}
                        </p>
                    )}
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
                            {global.contactEmail && (
                                <a
                                    href={`mailto:${global.contactEmail}`}
                                    className="flex items-center gap-4 text-neutral-300 hover:text-[#F3903F] transition-colors"
                                >
                                    <Mail className="w-6 h-6" />
                                    {global.contactEmail}
                                </a>
                            )}
                            {global.contactPhone && (
                                <a
                                    href={`tel:${global.contactPhone}`}
                                    className="flex items-center gap-4 text-neutral-300 hover:text-[#F3903F] transition-colors"
                                >
                                    <Phone className="w-6 h-6" />
                                    {global.contactPhone}
                                </a>
                            )}
                            {global.contactAddress && (
                                <div className="flex items-center gap-4 text-neutral-300">
                                    <MapPin className="w-6 h-6 flex-shrink-0" />
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
                            className="flex flex-wrap gap-6 justify-center md:justify-end items-center"
                        >
                            {global.linkedin && (
                                <a
                                    href={global.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-neutral-300 hover:text-[#0077b5] transition-colors"
                                >
                                    <Linkedin className="w-6 h-6" />
                                </a>
                            )}
                            {global.twitter && (
                                <a
                                    href={global.twitter}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-neutral-300 hover:text-[#1DA1F2] transition-colors"
                                >
                                    <Twitter className="w-6 h-6" />
                                </a>
                            )}
                            {global.facebook && (
                                <a
                                    href={global.facebook}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-neutral-300 hover:text-[#4267B2] transition-colors"
                                >
                                    <Facebook className="w-6 h-6" />
                                </a>
                            )}
                            {global.instagram && (
                                <a
                                    href={global.instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-neutral-300 hover:text-[#E1306C] transition-colors"
                                >
                                    <Instagram className="w-6 h-6" />
                                </a>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>
        </Section>
    );
}
