'use client';
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter, usePathname } from 'next/navigation';
import { siteConfig, locales, defaultLocale, type Locale } from "@/config/site-config"
import { useState, useEffect } from "react"
import Image from "next/image";

//improve navigation links when on article page because just changing locale in url will not work. slug can be different in other locales
export const Navigation = () => {
    const router = useRouter();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false)
    const [alternateUrls, setAlternateUrls] = useState<Record<Locale, string>>({} as Record<Locale, string>);

    const toggleMenu = () => setIsOpen(!isOpen)

    // Function to get the current locale from the pathname
    const getCurrentLocale = () => {
        const pathSegments = pathname.split('/');
        return locales.includes(pathSegments[1] as Locale) ? pathSegments[1] as Locale : defaultLocale;
    }

    const currentLocale = getCurrentLocale();

    // Check if we're on a blog article page
    const isBlogArticlePage = () => {
        const pathSegments = pathname.split('/');
        return pathSegments.length >= 4 && pathSegments[2] === 'blog' && pathSegments[3]?.length > 0;
    }

    // Extract blog slug and documentId from meta tags
    useEffect(() => {
        const fetchAlternateUrls = () => {
            // Get alternate URLs from link rel="alternate" meta tags if available
            const alternateLinks = document.querySelectorAll('link[rel="alternate"][hreflang]');
            
            const urls: Record<Locale, string> = {} as Record<Locale, string>;
            
            alternateLinks.forEach((link) => {
                const hrefLang = link.getAttribute('hreflang');
                const href = link.getAttribute('href');
                
                if (hrefLang && href && locales.includes(hrefLang as Locale)) {
                    urls[hrefLang as Locale] = href;
                }
            });
            
            if (Object.keys(urls).length > 0) {
                setAlternateUrls(urls);
            }
        };

        // Only run in the browser
        if (typeof window !== 'undefined') {
            fetchAlternateUrls();
        }
    }, [pathname]);

    // Function to switch locale
    const switchLocale = async (newLocale: Locale) => {
        // If on a blog article page, use the alternate URL if available
        if (isBlogArticlePage() && alternateUrls[newLocale]) {
            // If we have a full URL, extract the path part
            let targetPath = alternateUrls[newLocale];
            if (targetPath.startsWith('http')) {
                try {
                    const url = new URL(targetPath);
                    targetPath = url.pathname;
                } catch (error) {
                    console.error('Invalid URL in alternate link:', targetPath, error);
                }
            }
            
            router.push(targetPath);
            return;
        }
        
        // Default locale switching for non-blog pages or when alternates aren't available
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
                        {siteConfig.name[currentLocale]}
                    </span>
                </Link>

                <nav className="hidden md:flex items-center space-x-6">
                    {siteConfig.mainNav.map((item) => (
                        <Link
                            key={item.href}
                            href={`/${currentLocale}${item.href}`}
                            className="text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
                        >
                            {item.title[currentLocale]}
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
                        {siteConfig.mainNav.map((item) => (
                            <Link
                                key={item.href}
                                href={`/${currentLocale}${item.href}`}
                                className="block px-3 py-2 rounded-md text-base font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50"
                                onClick={() => setIsOpen(false)}
                            >
                                {item.title[currentLocale]}
                            </Link>
                        ))}
                    </div>
                </motion.div>
            )}
        </motion.header>
    )
} 