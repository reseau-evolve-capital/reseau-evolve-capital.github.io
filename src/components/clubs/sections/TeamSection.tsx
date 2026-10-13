'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Section } from '@/components/ui/Section';
import type { ClubDoc, Locale } from '@/lib/content-types';
import { imageUrl } from '@/lib/media';
import { copy } from '@/lib/copy';
import { Linkedin, Twitter } from 'lucide-react';

interface TeamSectionProps {
    club: ClubDoc;
    locale: Locale;
}

export function TeamSection({ club, locale }: TeamSectionProps) {
    if (club.executiveBoard.length === 0) return null;
    return (
        <Section>
            <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-heading text-center mb-12">{copy[locale].executiveBoard}</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {club.executiveBoard.map((member, index) => {
                        const image = imageUrl(member.image);
                        return (
                            <motion.div
                                key={`${member.name}-${index}`}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white rounded-xl shadow-sm p-6 text-center"
                            >
                                {image && (
                                    <div className="relative w-32 h-32 mx-auto mb-4">
                                        <Image
                                            src={image}
                                            alt={member.name}
                                            fill
                                            className="object-cover rounded-full"
                                        />
                                    </div>
                                )}
                                <h3 className="font-heading text-xl mb-1">{member.name}</h3>
                                {member.role && <p className="text-neutral-600 mb-4">{member.role}</p>}
                                {member.bio && <p className="text-sm text-neutral-500 mb-4">{member.bio}</p>}
                                <div className="flex justify-center gap-4">
                                    {member.linkedin && (
                                        <a
                                            href={member.linkedin}
                                            aria-label={`LinkedIn ${member.name}`}
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
                                            aria-label={`Twitter ${member.name}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-neutral-400 hover:text-[#1DA1F2] transition-colors"
                                        >
                                            <Twitter className="w-5 h-5" />
                                        </a>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </Section>
    );
} 