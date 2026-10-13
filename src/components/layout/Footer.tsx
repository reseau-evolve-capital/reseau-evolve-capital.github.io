'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { GlobalDoc, LinkGroupItem, Locale } from '@/lib/content-types';
import { Facebook, Twitter, Linkedin, Instagram, Mail, ArrowRight, ExternalLink } from 'lucide-react';
import { NewsletterButton } from "@/components/ui/NewsletterButton";

interface FooterProps {
    locale: Locale;
    global: GlobalDoc;
    linkGroups: LinkGroupItem[];
}

const isExternal = (href: string) => /^https?:|^mailto:|^tel:/.test(href);

export function Footer({ locale, global, linkGroups }: FooterProps) {
    const socialLinks = [
        { Icon: Linkedin, href: global.linkedin },
        { Icon: Twitter, href: global.twitter },
        { Icon: Facebook, href: global.facebook },
        { Icon: Instagram, href: global.instagram },
        { Icon: Mail, href: `/${locale}/contact` }
    ].filter((l): l is { Icon: typeof Mail; href: string } => Boolean(l.href));

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
                        {global.newsletterTitle && (
                            <h3 className="text-xl font-heading mb-4">
                                {global.newsletterTitle}
                            </h3>
                        )}
                        {global.newsletterDescription && (
                            <p className="text-neutral-400 mb-6">
                                {global.newsletterDescription}
                            </p>
                        )}
                        <NewsletterButton locale={locale} variant="hero" />
                    </div>

                    {/* Navigation Links */}
                    {linkGroups.map((group) => (
                        <div key={group.title}>
                            <h3 className="text-lg font-heading mb-6">
                                {group.title}
                            </h3>
                            <ul className="space-y-4">
                                {group.links.map((item) => (
                                    <li key={item.href}>
                                        <Link
                                            href={isExternal(item.href) ? item.href : `/${locale}${item.href}`}
                                            className="text-neutral-400 hover:text-white transition-colors flex items-center group"
                                        >
                                            <span>{item.label}</span>
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
                        <div className="flex flex-col md:flex-row items-center gap-2 text-neutral-400 text-sm">
                            {global.copyright && (
                                <>
                                    <p>{global.copyright}</p>
                                    <span className="hidden md:block">•</span>
                                </>
                            )}
                            <p>
                                <span>{locale === 'fr' ? 'Réalisé par ' : 'Built by '}</span>
                                <a 
                                    href="https://omniventus.com" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[#F3903F] hover:text-white transition-colors inline-flex items-center gap-1"
                                >
                                    Omniventus
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </p>
                        </div>
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            {/* Legal Links */}
                            <div className="flex gap-6 text-sm text-neutral-400">
                                <Link 
                                    href={`/${locale}/legal/privacy-policy`} 
                                    className="hover:text-white transition-colors"
                                >
                                    {locale === 'fr' ? 'Politique de Confidentialité' : 'Privacy Policy'}
                                </Link>
                                <Link 
                                    href={`/${locale}/legal/terms`} 
                                    className="hover:text-white transition-colors"
                                >
                                    {locale === 'fr' ? 'Mentions Légales' : 'Legal Notices'}
                                </Link>
                            </div>
                            
                            {/* Social Media Links */}
                            <div className="flex items-center gap-4">
                                {global.socialTitle && (
                                    <h3 className="text-sm font-medium">
                                        {global.socialTitle}
                                    </h3>
                                )}
                                <div className="flex gap-4">
                                    {socialLinks.map(({ Icon, href }) => (
                                        <Link
                                            key={href}
                                            href={href}
                                            target={href.startsWith('/') ? undefined : "_blank"}
                                            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#F3903F] transition-colors"
                                            rel={href.startsWith('/') ? undefined : "noopener noreferrer"}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
} 