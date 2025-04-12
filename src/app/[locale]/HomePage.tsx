'use client';

import { motion } from "framer-motion";
//import Image from "next/image";
import { type Locale } from "@/config/site-config";
import { pageContent } from "@/config/site-config";
//import { BackgroundPattern } from "@/components/BackgroundPattern";
//import { ThreeBackground } from "@/components/hero/ThreeBackground";
import { AnimatedBackground } from "@/components/hero/AnimatedBackground";
import { FloatingElements } from "@/components/hero/FloatingElements";
import { Introduction } from "@/components/sections/Introduction";
import { ValueProposition } from "@/components/sections/ValueProposition";
//import { HowItWorks } from "@/components/sections/HowItWorks";
//import { FeaturedClubs } from "@/components/sections/FeaturedClubs";
import { Events } from "@/components/sections/Events";
import { MediaResources } from "@/components/sections/MediaResources";
import { Membership } from "@/components/sections/Membership";
import { Partnerships } from "@/components/sections/Partnerships";
import { Button } from "@/components/ui/Button";
import { SectionNavigation } from "@/components/ui/SectionNavigation";
import { Suspense } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";

const FeaturedClubsContent = dynamic(() => import("@/components/sections/FeaturedClubs"), {
    ssr: false,
    loading: () => <p>Loading featured clubs...</p>,
});

export const dynamicParams = false;
type HomePageProps = {
    locale: Locale;
};

export default function HomePage({ locale }: HomePageProps) {
    const content = pageContent.home;

    const customElements = [
        {
            image: '/companies/apple.svg',
            size: 65,
            delay: 0,
            speed: 25,
            initialPosition: { x: 15, y: 30 }
        },
        {
            image: '/companies/lvmh.svg',
            size: 65,
            delay: 2,
            speed: 25,
            initialPosition: { x: 75, y: 30 }
        },
        {
            image: '/companies/essilor.svg',
            size: 65,
            delay: 3,
            speed: 25,
            initialPosition: { x: 55, y: 38 }
        },
        {
            image: '/companies/coca_cola.svg',
            size: 65,
            delay: 5,
            speed: 25,
            initialPosition: { x: 45, y: 30 }
        },
        {
            image: '/companies/microsoft.svg',
            size: 70,
            delay: 3,
            speed: 20,
            initialPosition: { x: 35, y: 60 }
        },
        {
            image: '/companies/amazon.svg',
            size: 75,
            delay: 6,
            speed: 22,
            initialPosition: { x: 55, y: 40 }
        },
        {
            image: '/companies/google.svg',
            size: 75,
            delay: 8,
            speed: 18,
            initialPosition: { x: 75, y: 70 }
        },
        {
            image: '/companies/meta.svg',
            size: 75,
            delay: 10,
            speed: 23,
            initialPosition: { x: 85, y: 25 }
        },
        {
            image: '/companies/tesla.svg',
            size: 75,
            delay: 12,
            speed: 23,
            initialPosition: { x: 85, y: 25 }
        }
    ];

    return (
        <div className="flex flex-col min-h-screen">
            {/* Section Navigation */}
            <SectionNavigation locale={locale} />
            
            {/* Hero Section */}
            <section id="hero" className="relative h-screen flex items-center justify-center overflow-hidden">
                <AnimatedBackground />
                <FloatingElements elements={customElements} />
                {/* <div className="absolute inset-0 z-0">
                    <Image
                        src="/images/hero-bg.jpg"
                        alt="Background"
                        fill
                        className="object-cover opacity-20"
                    />
                </div> */}
                <div className="container mx-auto px-4 z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-center"
                    >
                        <h1 className="text-4xl md:text-6xl font-heading mb-4">
                            <span className="block text-neutral-800">
                                {content.hero.title[locale]}
                            </span>
                            <span className="gradient-text">
                                {content.hero.subtitle[locale]}
                            </span>
                        </h1>
                        <p className="text-xl md:text-2xl text-neutral-600 mb-8 max-w-2xl mx-auto">
                            {content.hero.description[locale]}
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Button
                                size="lg"
                                className="text-lg"
                            >
                                <Link href={`/${locale}/contact`}>
                                    {content.hero.cta[locale]}
                                </Link>
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Introduction Section */}
            <section id="introduction">
                <Introduction locale={locale} />
            </section>

            {/* Value Proposition Section */}
            <section id="value-proposition">
                <ValueProposition locale={locale} />
            </section>

            {/* How It Works Section 
            <HowItWorks locale={locale} />
            */}

            {/* Featured Clubs Section */}
            <section id="clubs">
                <FeaturedClubsContent locale={locale} />
            </section>

            {/* Events Section */}
            <section id="events">
                <Events locale={locale} />
            </section>

            {/* Media Resources Section */}
            <section id="resources">
                <Suspense>
                    <MediaResources locale={locale} />
                </Suspense>
            </section>

            {/* Membership Section */}
            <section id="membership">
                <Membership locale={locale} />
            </section>

            {/* Partnerships Section */}
            <section id="partnerships">
                <Partnerships locale={locale} />
            </section>
        </div>
    );
}
