'use client';

import { motion } from 'framer-motion';
//import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { type Locale } from '@/config/site-config';
import { Facebook, Twitter, Linkedin, Instagram, Mail, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { useState } from 'react';
import { siteConfig } from '@/config/site-config';

interface FooterProps {
    locale: Locale;
}

export function Footer({ locale }: FooterProps) {
    const [email, setEmail] = useState('');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const content = siteConfig.pageContent.home.footer;

    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Implement newsletter subscription
        setIsSubscribed(true);
    };

    return (
        <footer className="relative bg-neutral-900 text-white overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(243,144,63,0.1)_50%,transparent_75%)] bg-[length:500px_500px]" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    {/* Newsletter Section */}
                    <div className="lg:col-span-2">
                        <Image
                            src="/brand/logo.png"
                            alt="Réseau Evolve Capital"
                            width={180}
                            height={40}
                            className="mb-6"
                        />
                        <h3 className="text-xl font-heading mb-4">
                            {content.newsletter.title[locale]}
                        </h3>
                        <p className="text-neutral-400 mb-6">
                            {content.newsletter.description[locale]}
                        </p>
                        {!isSubscribed ? (
                            <form onSubmit={handleSubscribe} className="flex gap-2">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={content.newsletter.placeholder[locale]}
                                    className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-[#F3903F] text-white placeholder-neutral-500"
                                    required
                                />
                                <Button type="submit" className="shrink-0">
                                    {content.newsletter.button[locale]}
                                </Button>
                            </form>
                        ) : (
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-[#F3903F]"
                            >
                                {content.newsletter.success[locale]}
                            </motion.p>
                        )}
                    </div>

                    {/* Navigation Links */}
                    {Object.entries(content.links).map(([key, section]) => (
                        <div key={key}>
                            <h3 className="text-lg font-heading mb-6">
                                {section.title[locale]}
                            </h3>
                            <ul className="space-y-4">
                                {section.items.map((item) => (
                                    <li key={item.href}>
                                        <Link
                                            href={`/${locale}${item.href}`}
                                            className="text-neutral-400 hover:text-white transition-colors flex items-center group"
                                        >
                                            <span>{item.label[locale]}</span>
                                            <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom Section */}
                <div className="border-t border-white/10 pt-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-neutral-400 text-sm">
                            {content.copyright[locale]}
                        </p>
                        <div className="flex items-center gap-4">
                            <h3 className="text-sm font-medium">
                                {content.social.title[locale]}
                            </h3>
                            <div className="flex gap-4">
                                {[
                                    { Icon: Linkedin, href: siteConfig.links.linkedin },
                                    { Icon: Twitter, href: siteConfig.links.twitter },
                                    { Icon: Facebook, href: siteConfig.links.facebook },
                                    { Icon: Instagram, href: siteConfig.links.instagram },
                                    { Icon: Mail, href: `/${locale}/contact` }
                                ].map(({ Icon, href }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#F3903F] transition-colors"
                                    >
                                        <Icon className="w-4 h-4" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
} 