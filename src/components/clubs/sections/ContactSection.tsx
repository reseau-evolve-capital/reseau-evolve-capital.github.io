'use client';

import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import type { ClubDoc, Locale } from '@/lib/content-types';
import { copy } from '@/lib/copy';
import { Mail, Phone, Building, ArrowRight } from 'lucide-react';
import Link from 'next/link';
interface ContactSectionProps {
    club: ClubDoc;
    locale: Locale;
}

export function ContactSection({ club, locale }: ContactSectionProps) {
    const contact = club.contactInfo;
    const requirements = club.joinProcess?.requirements ?? [];
    const hasContact = !!(contact?.email || contact?.phone || contact?.address);
    const t = copy[locale];
    return (
        <Section className="bg-gradient-to-br from-[#231F20] to-black text-white">
            <div className="max-w-4xl mx-auto">
                <div className="grid md:grid-cols-2 gap-12">
                    {hasContact && contact && (
                        <div>
                            <h2 className="text-3xl font-heading mb-8">{t.contactInformation}</h2>
                            <div className="space-y-6">
                                {contact.email && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        className="flex items-center gap-4"
                                    >
                                        <Mail className="w-6 h-6 text-[#F3903F]" />
                                        <a
                                            href={`mailto:${contact.email}`}
                                            className="hover:text-[#F3903F] transition-colors"
                                        >
                                            {contact.email}
                                        </a>
                                    </motion.div>
                                )}
                                {contact.phone && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.1 }}
                                        className="flex items-center gap-4"
                                    >
                                        <Phone className="w-6 h-6 text-[#F3903F]" />
                                        <a
                                            href={`tel:${contact.phone}`}
                                            className="hover:text-[#F3903F] transition-colors"
                                        >
                                            {contact.phone}
                                        </a>
                                    </motion.div>
                                )}
                                {contact.address && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.2 }}
                                        className="flex items-center gap-4"
                                    >
                                        <Building className="w-6 h-6 text-[#F3903F]" />
                                        <span>{contact.address}</span>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    )}
                    <div>
                        <h2 className="text-3xl font-heading mb-8">{t.joinTheClub}</h2>
                        <div className="space-y-6">
                            {requirements.map((req, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-center gap-4"
                                >
                                    <div className="w-6 h-6 rounded-full bg-[#F3903F]/20 flex items-center justify-center text-[#F3903F]">
                                        ✓
                                    </div>
                                    <span>{req.text}</span>
                                </motion.div>
                            ))}
                            <Button
                                className="w-full mt-6 group"
                                size="lg"
                            >
                                <Link href={`/${locale}/contact`} className="w-full flex items-center justify-center">
                                    {t.applyNow}
                                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </Section>
    );
} 