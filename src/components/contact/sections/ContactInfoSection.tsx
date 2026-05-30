'use client';

import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import { type Locale } from '@/config/site-config';
import { aboutUsContent } from '@/config/about-us-config';
import { Mail, Phone, Linkedin, Twitter, Facebook, Instagram } from 'lucide-react';

interface ContactInfoSectionProps {
    locale: Locale;
}

export function ContactInfoSection({ locale }: ContactInfoSectionProps) {
    const { contact } = aboutUsContent;

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
                        {locale === 'fr' ? 'Nous Contacter' : 'Get in Touch'}
                    </h2>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-12">
                    {/* Contact Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="space-y-6"
                    >
                        <h3 className="text-2xl font-heading mb-6">
                            {locale === 'fr' ? 'Coordonnées' : 'Contact Details'}
                        </h3>
                        <a
                            href={`mailto:${contact.email}`}
                            className="flex items-center gap-4 text-neutral-600 hover:text-[#F3903F] transition-colors"
                        >
                            <Mail className="w-6 h-6 text-[#F3903F]" />
                            {contact.email}
                        </a>
                        {contact.phone && (
                            <a
                                href={`tel:${contact.phone}`}
                                className="flex items-center gap-4 text-neutral-600 hover:text-[#F3903F] transition-colors"
                            >
                                <Phone className="w-6 h-6 text-[#F3903F]" />
                                {contact.phone}
                            </a>
                        )}
                        {/* <div className="flex items-center gap-4 text-neutral-600">
                            <MapPin className="w-6 h-6 text-[#F3903F] flex-shrink-0" />
                            {contact.address[locale]}
                        </div> */}
                    </motion.div>

                    {/* Social Links */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <h3 className="text-2xl font-heading mb-6">
                            {locale === 'fr' ? 'Réseaux Sociaux' : 'Social Media'}
                        </h3>
                        <p className="text-neutral-600 mb-6">
                            {locale === 'fr' 
                                ? 'Suivez-nous pour rester informé des dernières actualités et opportunités.'
                                : 'Follow us to stay updated with the latest news and opportunities.'}
                        </p>
                        <div className="flex flex-wrap gap-6">
                            {contact.social.linkedin && (
                                <a
                                    href={contact.social.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-neutral-600 hover:text-[#0077b5] transition-colors"
                                >
                                    <Linkedin className="w-6 h-6" />
                                    <span>LinkedIn</span>
                                </a>
                            )}
                            {contact.social.twitter && (
                                <a
                                    href={contact.social.twitter}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-neutral-600 hover:text-[#1DA1F2] transition-colors"
                                >
                                    <Twitter className="w-6 h-6" />
                                    <span>Twitter</span>
                                </a>
                            )}
                            {contact.social.facebook && (
                                <a
                                    href={contact.social.facebook}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-neutral-600 hover:text-[#4267B2] transition-colors"
                                >
                                    <Facebook className="w-6 h-6" />
                                    <span>Facebook</span>
                                </a>
                            )}
                            {contact.social.instagram && (
                                <a
                                    href={contact.social.instagram}
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
                </div>
            </div>
        </Section>
    );
} 