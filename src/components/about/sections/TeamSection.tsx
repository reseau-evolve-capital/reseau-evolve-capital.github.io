'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Section } from '@/components/ui/Section';
import { type Locale } from '@/config/site-config';
import { aboutUsContent } from '@/config/about-us-config';
import { Linkedin, Twitter, Mail } from 'lucide-react';

interface TeamSectionProps {
    locale: Locale;
}

export function TeamSection({ locale }: TeamSectionProps) {
    const { team } = aboutUsContent;

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
                        {team.title[locale]}
                    </h2>
                    <p className="text-xl text-neutral-600">
                        {team.subtitle[locale]}
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8 mb-16">
                    {team.members.map((member, index) => (
                        <motion.div
                            key={member.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white rounded-xl p-6 text-center shadow-sm"
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
                            {member.social && (
                                <div className="flex justify-center gap-4">
                                    {member.social.linkedin && (
                                        <a
                                            href={member.social.linkedin}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-neutral-400 hover:text-[#0077b5] transition-colors"
                                        >
                                            <Linkedin className="w-5 h-5" />
                                        </a>
                                    )}
                                    {member.social.twitter && (
                                        <a
                                            href={member.social.twitter}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-neutral-400 hover:text-[#1DA1F2] transition-colors"
                                        >
                                            <Twitter className="w-5 h-5" />
                                        </a>
                                    )}
                                    {member.social.email && (
                                        <a
                                            href={`mailto:${member.social.email}`}
                                            className="text-neutral-400 hover:text-[#F3903F] transition-colors"
                                        >
                                            <Mail className="w-5 h-5" />
                                        </a>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </Section>
    );
} 