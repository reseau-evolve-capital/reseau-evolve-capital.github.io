'use client';

import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { type Club, type Locale } from '@/config/site-config';
import { Mail, Phone, Building, ArrowRight } from 'lucide-react';

interface ContactSectionProps {
    club: Club;
    locale: Locale;
}

export function ContactSection({ club, locale }: ContactSectionProps) {
    return (
        <Section className="bg-gradient-to-br from-[#231F20] to-black text-white">
            <div className="max-w-4xl mx-auto">
                <div className="grid md:grid-cols-2 gap-12">
                    <div>
                        <h2 className="text-3xl font-heading mb-8">Contact Information</h2>
                        <div className="space-y-6">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="flex items-center gap-4"
                            >
                                <Mail className="w-6 h-6 text-[#F3903F]" />
                                <a
                                    href={`mailto:${club.contactInfo.email}`}
                                    className="hover:text-[#F3903F] transition-colors"
                                >
                                    {club.contactInfo.email}
                                </a>
                            </motion.div>
                            {club.contactInfo.phone && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.1 }}
                                    className="flex items-center gap-4"
                                >
                                    <Phone className="w-6 h-6 text-[#F3903F]" />
                                    <a
                                        href={`tel:${club.contactInfo.phone}`}
                                        className="hover:text-[#F3903F] transition-colors"
                                    >
                                        {club.contactInfo.phone}
                                    </a>
                                </motion.div>
                            )}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                                className="flex items-center gap-4"
                            >
                                <Building className="w-6 h-6 text-[#F3903F]" />
                                <span>{club.contactInfo.address[locale]}</span>
                            </motion.div>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-heading mb-8">Join the Club</h2>
                        <div className="space-y-6">
                            {club.joinProcess.requirements.map((req, index) => (
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
                                    <span>{req[locale]}</span>
                                </motion.div>
                            ))}
                            <Button
                                className="w-full mt-6 group"
                                size="lg"
                            >
                                Apply Now
                                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </Section>
    );
} 