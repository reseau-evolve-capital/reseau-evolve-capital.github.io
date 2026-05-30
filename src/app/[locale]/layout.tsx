import { type Metadata } from "next"
import "@/app/globals.css"

import { Navigation } from "@/components/navigation"
import { siteConfig, type Locale } from "@/config/site-config"
import { Analytics } from "@/components/Analytics"
import { Footer } from '@/components/layout/Footer'
import { ScrollToTop } from '@/components/ui/ScrollToTop'
import { NewsletterProvider } from '@/components/newsletter'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
type Props = {
    children: React.ReactNode
    params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params
    return {
        metadataBase: new URL(siteConfig.url),
        keywords: ['comment investir en bourse', 'club investment', 'débuter en bourse', 'clubs d\'investissement', 'education financière', 'apprendre à investir en bourse', 'independance financière', 'group investment', 'investir dans l\'imobilier en groupe', 'ethereum', 'blockchain', 'defi', 'web3', 'nft', 'solana', 'polkadot', 'cardano', 'dogecoin', 'shiba inu', 'ethereum', 'bitcoin', 'nyse', 'education', 'investor', 'cash', 'group investment'],
        title: {
            default: siteConfig.name[locale],
            template: `%s | ${siteConfig.name[locale]}`,
        },
        description: siteConfig.description[locale],
        // icons: {
        //     icon: "/favicon.ico",
        // },
        // Enhanced SEO settings

        openGraph: {
            title: siteConfig.name[locale],
            description: siteConfig.description[locale],
            type: "website",
            images: [
                {
                    url: siteConfig.openGraph.image,
                    type: "image/png",
                    width: 1200,
                    height: 630,
                },
                // {
                //   url: siteConfig.author.avatar,
                //   type: "image/png",
                //   width: 1200,
                //   height: 630,
                // },
            ],
        },
    }
}

export default async function LocaleLayout({ children, params }: Props) {
    const { locale } = await params

    // Add this to validate locale
    const validLocales = ['fr', 'en'];
    if (!validLocales.includes(locale)) {
        notFound();
    }

    return (
        <html lang={locale}>
            <body className="min-h-screen bg-white font-sans antialiased">
                <Suspense>
                    <NewsletterProvider locale={locale}>
                        <div className="relative flex min-h-screen flex-col">
                            <Navigation />
                            <main className="flex-1">{children}</main>
                            <Footer locale={locale} />
                            <ScrollToTop />
                        </div>
                        <Analytics />
                    </NewsletterProvider>
                </Suspense>
            </body>
        </html>
    )
} 