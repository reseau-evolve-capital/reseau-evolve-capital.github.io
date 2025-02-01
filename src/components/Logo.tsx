'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

type LogoProps = {
    size?: number;
    className?: string;
    animated?: boolean;
};

export function Logo({ size = 40, className = '', animated = true }: LogoProps) {
    if (animated) {
        return (
            <motion.div
                className={`relative ${className}`}
                style={{ width: size, height: size }}
                whileHover={{ scale: 1.05 }}
            >
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                >
                    {/* SVG Logo with animation */}
                    <Image
                        src="/brand/logo.png"
                        alt="Reseau Evovle Capital Logo"
                        width={size}
                        height={size}
                        className="w-full h-full"
                        priority
                    />
                </motion.div>
            </motion.div>
        );
    }

    // Non-animated fallback version
    return (
        <div className={`relative ${className}`} style={{ width: size, height: size }}>
            <Image
                src="/brand/logo.svg"
                alt="Reseau Evovle Capital Logo"
                width={size}
                height={size}
                className="w-full h-full"
                priority
            />
        </div>
    );
} 