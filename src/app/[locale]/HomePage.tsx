'use client';

import { motion } from "framer-motion";
import Image from "next/image";
import { type Locale } from "@/config/site-config";
import { pageContent } from "@/config/site-config";
//import { BackgroundPattern } from "@/components/BackgroundPattern";
//import { ThreeBackground } from "@/components/hero/ThreeBackground";
import { AnimatedBackground } from "@/components/hero/AnimatedBackground";
import { FloatingElements } from "@/components/hero/FloatingElements";

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
            {/* Hero Section */}
            <section className="relative h-screen flex items-center justify-center overflow-hidden">
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
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-gradient-to-r from-[#F3903F] to-[#E93E3A] text-white px-8 py-4 rounded-full text-lg font-bold shadow-lg hover:shadow-xl transition-shadow"
                        >
                            {content.hero.cta[locale]}
                        </motion.button>
                    </motion.div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-20 bg-neutral-50">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-heading text-center mb-16">
                        {content.stats.title[locale]}
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {content.stats.items.map((stat, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="text-center"
                            >
                                <div className="text-4xl md:text-5xl font-heading gradient-text mb-2">
                                    {stat.value}
                                </div>
                                <div className="text-neutral-600">
                                    {stat.label[locale]}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Services Section */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-heading text-center mb-16">
                        {content.services.title[locale]}
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {content.services.items.map((service, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
                            >
                                <div className="text-4xl mb-4">{service.icon}</div>
                                <h3 className="text-xl font-heading mb-4">{service.title[locale]}</h3>
                                <p className="text-neutral-600">{service.description[locale]}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
