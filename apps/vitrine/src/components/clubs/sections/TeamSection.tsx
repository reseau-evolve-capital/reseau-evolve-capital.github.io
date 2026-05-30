'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Section } from '@/components/ui/Section';
import { type Club, type Locale } from '@/config/site-config';
import { Linkedin, Twitter } from 'lucide-react';

interface TeamSectionProps {
    club: Club;
    locale: Locale;
}

export function TeamSection({ club, locale }: TeamSectionProps) {
    return (
        <Section>
            <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-heading text-center mb-12">Executive Board</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {club.executiveBoard.map((member, index) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white rounded-xl shadow-sm p-6 text-center"
                        >
                            <div className="relative w-32 h-32 mx-auto mb-4">
                                <Image
                                    src={member.image}
                                    alt={member.name}
                                    fill
                                    className="object-cover rounded-full"
                                />
                            </div>
                            <h3 className="font-heading text-xl mb-1">{member.name}</h3>
                            <p className="text-neutral-600 mb-4">{member.role[locale]}</p>
                            <p className="text-sm text-neutral-500 mb-4">{member.bio[locale]}</p>
                            <div className="flex justify-center gap-4">
                                {member.linkedin && (
                                    <a
                                        href={member.linkedin}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-neutral-400 hover:text-[#0077b5] transition-colors"
                                    >
                                        <Linkedin className="w-5 h-5" />
                                    </a>
                                )}
                                {member.twitter && (
                                    <a
                                        href={member.twitter}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-neutral-400 hover:text-[#1DA1F2] transition-colors"
                                    >
                                        <Twitter className="w-5 h-5" />
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </Section>
    );
} 