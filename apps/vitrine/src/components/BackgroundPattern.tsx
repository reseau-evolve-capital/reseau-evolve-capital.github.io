'use client';

import { motion } from 'framer-motion';

export const BackgroundPattern = () => {
    return (
        <div className="absolute inset-0 -z-10 overflow-hidden">
            <motion.div
                className="absolute inset-0 bg-gradient-to-br from-primary-yellow/10 via-primary-orange/10 to-primary-red/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
            />
            <svg
                className="absolute top-0 left-0 w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
                width="100%"
                height="100%"
                viewBox="0 0 1440 800"
                preserveAspectRatio="none"
            >
                <motion.path
                    d="M0,800 C600,650 800,750 1440,800 V0 H0 V800 Z"
                    fill="url(#gradient)"
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 0.1, y: 0 }}
                    transition={{ duration: 1.5 }}
                >
                    <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFF33B" />
                            <stop offset="50%" stopColor="#F3903F" />
                            <stop offset="100%" stopColor="#E93E3A" />
                        </linearGradient>
                    </defs>
                </motion.path>
            </svg>
        </div>
    );
}; 