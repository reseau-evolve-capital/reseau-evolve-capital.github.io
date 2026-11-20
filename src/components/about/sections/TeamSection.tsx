'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Section } from '@/components/ui/Section';
import type { TeamSection as TeamSectionData } from '@/lib/content-types';
import { imageUrl } from '@/lib/media';
import { safeHref } from '@/lib/links';
import type { SectionProps } from '@/components/sections/components';
import { Linkedin, Twitter, Mail } from 'lucide-react';

export function TeamSection({ data: team }: SectionProps<TeamSectionData>) {
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
                        {team.title}
                    </h2>
                    {team.subtitle && (
                        <p className="text-xl text-neutral-600">
                            {team.subtitle}
                        </p>
                    )}
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8 mb-16">
                    {team.members.map((member, index) => {
                        const image = imageUrl(member.image);
                        const linkedin = safeHref(member.linkedin);
                        const twitter = safeHref(member.twitter);
                        return (
                            <motion.div
                                key={`${member.name}-${index}`}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white rounded-xl p-6 text-center shadow-sm"
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
                                {(linkedin || twitter || member.email) && (
                                    <div className="flex justify-center gap-4">
                                        {linkedin && (
                                            <a
                                                href={linkedin}
                                                aria-label={`LinkedIn ${member.name}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-neutral-400 hover:text-[#0077b5] transition-colors"
                                            >
                                                <Linkedin className="w-5 h-5" />
                                            </a>
                                        )}
                                        {twitter && (
                                            <a
                                                href={twitter}
                                                aria-label={`Twitter ${member.name}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-neutral-400 hover:text-[#1DA1F2] transition-colors"
                                            >
                                                <Twitter className="w-5 h-5" />
                                            </a>
                                        )}
                                        {member.email && (
                                            <a
                                                href={`mailto:${member.email}`}
                                                aria-label={`Email ${member.name}`}
                                                className="text-neutral-400 hover:text-[#F3903F] transition-colors"
                                            >
                                                <Mail className="w-5 h-5" />
                                            </a>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </Section>
    );
}
