'use client';

import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import { type Locale } from '@/config/site-config';
import { aboutUsContent } from '@/config/about-us-config';
import { MapPin, Calendar, Clock } from 'lucide-react';

interface FindUsSectionProps {
    locale: Locale;
}

export function FindUsSection({ locale }: FindUsSectionProps) {
    const { contact } = aboutUsContent;

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
                        {locale === 'fr' ? 'Où Nous Trouver' : 'Where to Find Us'}
                    </h2>
                    <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
                        {locale === 'fr' 
                            ? 'Nos clubs d\'investissement sont actifs dans plusieurs localités en France.'
                            : 'Our investment clubs are active in several locations throughout France.'}
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-12">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="space-y-6"
                    >
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-100 space-y-4">
                            <h3 className="text-2xl font-heading">
                                {locale === 'fr' ? 'Siège Social' : 'Headquarters'}
                            </h3>
                            <div className="flex items-start gap-4 text-neutral-600">
                                <MapPin className="w-6 h-6 text-[#F3903F] flex-shrink-0 mt-1" />
                                <p className="leading-relaxed">{contact.address[locale]}</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-100 space-y-4">
                            <h3 className="text-2xl font-heading">
                                {locale === 'fr' ? 'Horaires d\'Ouverture' : 'Opening Hours'}
                            </h3>
                            <div className="flex items-start gap-4 text-neutral-600">
                                <Calendar className="w-6 h-6 text-[#F3903F] flex-shrink-0 mt-1" />
                                <div>
                                    <p className="leading-relaxed">
                                        {locale === 'fr' ? 'Lundi - Vendredi' : 'Monday - Friday'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 text-neutral-600">
                                <Clock className="w-6 h-6 text-[#F3903F] flex-shrink-0 mt-1" />
                                <div>
                                    <p className="leading-relaxed">9:00 - 18:00</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="rounded-xl overflow-hidden aspect-square md:aspect-auto md:h-full shadow-md"
                    >
                        <iframe 
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2625.033197627418!2d2.2898393!3d48.8582602!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47e6701f7e8337b5%3A0xa2cb58dd28914524!2sEiffel%20Tower!5e0!3m2!1sen!2sfr!4v1620241833076!5m2!1sen!2sfr"
                            width="100%" 
                            height="100%" 
                            style={{ border: 0 }} 
                            allowFullScreen={false} 
                            loading="lazy"
                            aria-label={locale === 'fr' ? 'Carte Google Maps montrant notre emplacement' : 'Google Maps showing our location'}
                        />
                    </motion.div>
                </div>
            </div>
        </Section>
    );
} 