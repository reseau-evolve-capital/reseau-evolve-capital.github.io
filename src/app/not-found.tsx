'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { FiCoffee, FiArrowLeft } from 'react-icons/fi';
import { siteConfig } from '@/config/site-config';

const coffeeMessages = [
    "Lost in the digital wilderness? ☕️",
    "Found a secret path! Coffee time? ☕️",
    "404: Coffee not found. Let's fix that! ☕️",
    "You've discovered my coffee break spot! ☕️",
    "This page is brewing... Want some coffee? ☕️"
];

export default function NotFound() {
    const randomMessage = coffeeMessages[Math.floor(Math.random() * coffeeMessages.length)];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex items-center justify-center">
            <div className="container max-w-2xl mx-auto px-4 py-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="relative w-32 h-32 mx-auto mb-8"
                    >
                        <Image
                            src={siteConfig.author.avatar}
                            alt={siteConfig.author.name}
                            fill
                            className="rounded-full object-cover border-4 border-white/10"
                        />
                        <motion.div
                            animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                            transition={{ delay: 1, duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                            className="absolute -right-2 -bottom-2 bg-yellow-500 rounded-full p-3"
                        >
                            <FiCoffee size={24} className="text-gray-900" />
                        </motion.div>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-3xl sm:text-4xl font-bold mb-4"
                    >
                        {randomMessage}
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="text-gray-400 mb-8"
                    >
                        If you enjoyed my work, consider buying me a coffee!
                    </motion.p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <motion.a
                            href={siteConfig.author.social.buyMeACoffee}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-yellow-500 text-gray-900 rounded-xl font-semibold hover:bg-yellow-400 transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <FiCoffee size={20} />
                            Buy me a coffee
                        </motion.a>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1 }}
                        >
                            <Link
                                href="/"
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors"
                            >
                                <FiArrowLeft size={20} />
                                Back to Home
                            </Link>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
} 