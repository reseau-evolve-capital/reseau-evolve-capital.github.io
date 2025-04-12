'use client';

import Link from 'next/link';
import Image from 'next/image';
import { type Locale } from '@/config/site-config';
import { Facebook, Twitter, Linkedin, Instagram, Mail, ArrowRight } from 'lucide-react';
import { siteConfig } from '@/config/site-config';
import { AnchorLink } from '../ui/AnchorLink';
import { homeSectionIds } from '@/lib/navigation';
import { NewsletterButton } from "@/components/ui/NewsletterButton";

interface FooterProps {
    locale: Locale;
}

// Map of footer link paths to home section IDs for anchor navigation
const homeAnchorMap: Record<string, string> = {
    '/clubs': homeSectionIds.clubs,
    '/events': homeSectionIds.events,
    '/resources': homeSectionIds.resources,
    '/partnerships': homeSectionIds.partnerships,
    '/membership/benefits': homeSectionIds.membership
};

export function Footer({ locale }: FooterProps) {
    const content = siteConfig.pageContent.home.footer;



    // Determines if a link should use anchor navigation or regular navigation
    const isAnchorLink = (href: string): boolean => {
        return Object.keys(homeAnchorMap).includes(href);
    };

    // Gets the section ID for a home page section, if applicable
    const getSectionIdForLink = (href: string): string | undefined => {
        if (isAnchorLink(href)) {
            return homeAnchorMap[href];
        }
        return undefined;
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
                        <NewsletterButton locale={locale} variant="hero" />
                    </div>

                    {/* Navigation Links */}
                    {Object.entries(content.links).map(([key, section]) => (
                        <div key={key}>
                            <h3 className="text-lg font-heading mb-6">
                                {section.title[locale]}
                            </h3>
                            <ul className="space-y-4">
                                {section.items.map((item) => {
                                    const sectionId = getSectionIdForLink(item.href);
                                    
                                    return (
                                        <li key={item.href}>
                                            {isAnchorLink(item.href) ? (
                                                <AnchorLink
                                                    href={`/${locale}`}
                                                    sectionId={sectionId}
                                                    locale={locale}
                                                    className="text-neutral-400 hover:text-white transition-colors flex items-center group"
                                                >
                                                    <span>{item.label[locale]}</span>
                                                    <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                                </AnchorLink>
                                            ) : (
                                                <Link
                                                    href={`/${locale}${item.href}`}
                                                    className="text-neutral-400 hover:text-white transition-colors flex items-center group"
                                                >
                                                    <span>{item.label[locale]}</span>
                                                    <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                                </Link>
                                            )}
                                        </li>
                                    );
                                })}
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
                                        target="_blank"
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