'use client';
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter, usePathname } from 'next/navigation';
import { locales, defaultLocale, type Locale } from "@/config/site-config"
import { useState } from "react"
import Image from "next/image";

type NavigationProps = {
    siteName: string;
    navigation: { label: string; href: string }[];
};

const isExternal = (href: string) => /^https?:|^mailto:|^tel:/.test(href);

// hreflang posés par generateMetadata (alternates.languages) : pages Strapi et articles de blog.
const readAlternateUrls = () => {
    const urls: Partial<Record<Locale, string>> = {};
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((link) => {
        const hrefLang = link.getAttribute('hreflang');
        const href = link.getAttribute('href');
        if (hrefLang && href && locales.includes(hrefLang as Locale)) {
            urls[hrefLang as Locale] = href.startsWith('http') ? new URL(href).pathname : href;
        }
    });
    return urls;
};

export const Navigation = ({ siteName, navigation }: NavigationProps) => {
    const router = useRouter();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false)

    const toggleMenu = () => setIsOpen(!isOpen)

    const pathSegments = pathname.split('/');
    const currentLocale = locales.includes(pathSegments[1] as Locale) ? pathSegments[1] as Locale : defaultLocale;
    const isBlogArticlePage = pathSegments.length >= 4 && pathSegments[2] === 'blog' && pathSegments[3]?.length > 0;
    // Blog (liste, catégories) et clubs : remplacement du préfixe de langue, comme avant.
    const isPrefixRoute = ['blog', 'clubs'].includes(pathSegments[2] ?? '') && !isBlogArticlePage;

    const navHref = (href: string) => isExternal(href) ? href : `/${currentLocale}${href === '/' ? '' : href}`;

    const switchLocale = (newLocale: Locale) => {
        if (!isPrefixRoute) {
            const alternateUrls = readAlternateUrls();
            if (alternateUrls[newLocale]) return router.push(alternateUrls[newLocale]);
            // Page Strapi absente dans l'autre langue : accueil de cette langue.
            if (!isBlogArticlePage && Object.keys(alternateUrls).length > 0) return router.push(`/${newLocale}/`);
        }
        const pathWithoutLocale = pathname.replace(/^\/[^\/]+/, '');
        router.push(`/${newLocale}${pathWithoutLocale || '/'}`);
    }

    return (
        <motion.header
            className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm"
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href={`/${currentLocale}`} className="flex items-center space-x-2">
                    <Image src="/brand/logo.png" alt="REC Logo" width={32} height={32} className="h-8 w-auto" />
                    <span className="font-heading text-xl font-bold">
                        {siteName}
                    </span>
                </Link>

                <nav className="hidden md:flex items-center space-x-6">
                    {navigation.map((item) => (
                        <Link
                            key={item.href}
                            href={navHref(item.href)}
                            className="text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
                        >
                            {item.label}
                        </Link>
                    ))}
                    <div className="flex space-x-2">
                        {locales.map((loc) => (
                            <button
                                key={loc}
                                onClick={() => switchLocale(loc)}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${currentLocale === loc
                                    ? 'bg-neutral-200 text-neutral-900'
                                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                                    }`}
                            >
                                {loc.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </nav>

                <button
                    className="md:hidden"
                    onClick={toggleMenu}
                    aria-label="Toggle menu"
                >
                    <svg
                        className="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                        />
                    </svg>
                </button>
            </div>

            {/* Mobile menu */}
            {isOpen && (
                <motion.div
                    className="md:hidden"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                >
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        {navigation.map((item) => (
                            <Link
                                key={item.href}
                                href={navHref(item.href)}
                                className="block px-3 py-2 rounded-md text-base font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50"
                                onClick={() => setIsOpen(false)}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </motion.div>
            )}
        </motion.header>
    )
} 