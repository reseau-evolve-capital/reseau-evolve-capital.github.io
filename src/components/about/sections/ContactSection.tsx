'use client';

import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import { type Locale } from '@/config/site-config';
import { aboutUsContent } from '@/config/about-us-config';
import { Mail, Phone, MapPin, Linkedin, Twitter, Facebook, Instagram } from 'lucide-react';

interface ContactSectionProps {
    locale: Locale;
}

export function ContactSection({ locale }: ContactSectionProps) {
    const { contact } = aboutUsContent;

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
                        {contact.title[locale]}
                    </h2>
                    <p className="text-xl text-neutral-300">
                        {contact.content[locale]}
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-12">
                    {/* Contact Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="space-y-6"
                    >
                        <a
                            href={`mailto:${contact.email}`}
                            className="flex items-center gap-4 text-neutral-300 hover:text-[#F3903F] transition-colors"
                        >
                            <Mail className="w-6 h-6" />
                            {contact.email}
                        </a>
                        {contact.phone && (
                            <a
                                href={`tel:${contact.phone}`}
                                className="flex items-center gap-4 text-neutral-300 hover:text-[#F3903F] transition-colors"
                            >
                                <Phone className="w-6 h-6" />
                                {contact.phone}
                            </a>
                        )}
                        <div className="flex items-center gap-4 text-neutral-300">
                            <MapPin className="w-6 h-6 flex-shrink-0" />
                            {contact.address[locale]}
                        </div>
                    </motion.div>

                    {/* Social Links */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="flex flex-wrap gap-6 justify-center md:justify-end items-center"
                    >
                        {contact.social.linkedin && (
                            <a
                                href={contact.social.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-neutral-300 hover:text-[#0077b5] transition-colors"
                            >
                                <Linkedin className="w-6 h-6" />
                            </a>
                        )}
                        {contact.social.twitter && (
                            <a
                                href={contact.social.twitter}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-neutral-300 hover:text-[#1DA1F2] transition-colors"
                            >
                                <Twitter className="w-6 h-6" />
                            </a>
                        )}
                        {contact.social.facebook && (
                            <a
                                href={contact.social.facebook}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-neutral-300 hover:text-[#4267B2] transition-colors"
                            >
                                <Facebook className="w-6 h-6" />
                            </a>
                        )}
                        {contact.social.instagram && (
                            <a
                                href={contact.social.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-neutral-300 hover:text-[#E1306C] transition-colors"
                            >
                                <Instagram className="w-6 h-6" />
                            </a>
                        )}
                    </motion.div>
                </div>
            </div>
        </Section>
    );
} 