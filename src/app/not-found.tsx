'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { FiTrendingDown, FiArrowLeft, FiDollarSign } from 'react-icons/fi';
import { siteConfig } from '@/config/site-config';

const stockMessages = [
    "Oops! Looks like this page took a nosedive! 📉",
    "404: This page is as elusive as a bull market! 🐂",
    "Lost in the stock market shuffle? Let's get back on track! 📈",
    "This page is under a bear attack! 🐻",
    "Page not found! Time to diversify your clicks! 📊"
];

const candleColors = ['#FFF33B', '#FDC70C', '#F3903F', '#E93E3A'];

export default function NotFound() {
    const randomMessage = stockMessages[Math.floor(Math.random() * stockMessages.length)];
    if (typeof window === "undefined") {
        return null;
    }

    return (
        <html>
            <body>
                <div className="min-h-screen bg-gradient-to-br from-[#231F20] via-[#1a1718] to-black text-white flex items-center justify-center overflow-hidden relative">
                    {/* Animated background elements */}
                    <div className="absolute inset-0 overflow-hidden">
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute"
                                initial={{
                                    x: -100,
                                    y: Math.random() * window.innerHeight,
                                    opacity: 0.3
                                }}
                                animate={{
                                    x: window.innerWidth + 100,
                                    opacity: [0.3, 0.6, 0.3]
                                }}
                                transition={{
                                    duration: 15 + Math.random() * 10,
                                    repeat: Infinity,
                                    delay: i * 0.5,
                                    ease: "linear"
                                }}
                            >
                                <div
                                    className="h-20 w-4 rounded"
                                    style={{
                                        backgroundColor: candleColors[i % candleColors.length],
                                        boxShadow: `0 0 20px ${candleColors[i % candleColors.length]}33`
                                    }}
                                />
                            </motion.div>
                        ))}
                    </div>

                    <div className="container max-w-4xl mx-auto px-4 py-20 relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center"
                        >
                            {/* Logo and Chart Icon */}
                            <div className="flex justify-center items-center gap-8 mb-12">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                    className="relative w-40 h-40"
                                >
                                    <Image
                                        src={"/brand/logo.png"}
                                        alt={"logo"}
                                        fill
                                        className="rounded-full object-cover border-4 border-[#F3903F]/20"
                                    />
                                    <motion.div
                                        animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                                        transition={{ delay: 1, duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                                        className="absolute -right-4 -bottom-4 bg-[#F3903F] rounded-full p-4"
                                    >
                                        <FiTrendingDown size={32} className="text-[#231F20]" />
                                    </motion.div>
                                </motion.div>

                                {/* Animated Chart Lines */}
                                <motion.div
                                    className="hidden md:block w-64 h-32"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <svg viewBox="0 0 200 100" className="w-full h-full">
                                        <motion.path
                                            d="M0,50 C20,50 40,80 60,60 S100,20 140,40 S180,60 200,30"
                                            fill="none"
                                            stroke="#F3903F"
                                            strokeWidth="2"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 2, ease: "easeInOut" }}
                                        />
                                    </svg>
                                </motion.div>
                            </div>

                            <motion.h1
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-[#FFF33B] via-[#F3903F] to-[#E93E3A] text-transparent bg-clip-text"
                            >
                                {randomMessage}
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="text-[#B3B5B7] text-xl mb-12"
                            >
                                Even the best investors hit a snag sometimes. Let&apos;s get you back on track!
                            </motion.p>

                            <div className="flex flex-col sm:flex-row gap-6 justify-center">
                                <motion.a
                                    href={siteConfig.author.social.buyMeACoffee}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.8 }}
                                    className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-[#FDC70C] to-[#F3903F] text-[#231F20] rounded-xl font-semibold shadow-lg shadow-[#F3903F]/20"
                                    whileHover={{ scale: 1.05, filter: "brightness(110%)" }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <FiDollarSign size={24} />
                                    Support Our Mission
                                </motion.a>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1 }}
                                >
                                    <Link
                                        href="/"
                                        className="flex items-center justify-center gap-3 px-8 py-4 bg-[#B3B5B7]/10 text-white rounded-xl hover:bg-[#B3B5B7]/20 transition-colors border border-[#B3B5B7]/20"
                                    >
                                        <FiArrowLeft size={24} />
                                        Back to Home
                                    </Link>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </body>
        </html>
    );
} 