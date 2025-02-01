import { type Metadata } from "next"
import "@/app/globals.css"

import { Navigation } from "@/components/navigation"
import { siteConfig, type Locale } from "@/config/site-config"
import { Analytics } from "@/components/Analytics"

type Props = {
    children: React.ReactNode
    params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params
    return {
        title: {
            default: siteConfig.name[locale],
            template: `%s | ${siteConfig.name[locale]}`,
        },
        description: siteConfig.description[locale],
        icons: {
            icon: "/favicon.ico",
        },
    }
}

export default async function LocaleLayout({ children, params }: Props) {
    const { locale } = await params
    return (
        <html lang={locale}>
            <body className="min-h-screen bg-white font-sans antialiased">
                <div className="relative flex min-h-screen flex-col">
                    <Navigation />
                    <main className="flex-1">{children}</main>
                </div>
                <Analytics />
            </body>
        </html>
    )
} 