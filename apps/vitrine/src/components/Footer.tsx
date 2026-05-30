'use client';

import { motion } from 'framer-motion';
import { siteConfig } from '@/config/site-config';

export function Footer() {
    return (
        <footer className="py-4 text-center text-sm text-gray-400">
            <p>
                Made by{' '}
                <motion.a
                    href={siteConfig.author.social.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {siteConfig.author.name}
                </motion.a>
            </p>
        </footer>
    );
} 