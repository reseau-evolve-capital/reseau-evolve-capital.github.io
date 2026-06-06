'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SectionProps extends HTMLMotionProps<'section'> {
    className?: string;
    children: React.ReactNode;
    fullWidth?: boolean;
}

export function Section({
    className,
    children,
    fullWidth = false,
    ...props
}: SectionProps) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className={cn(
                "py-20 overflow-hidden",
                className
            )}
            {...props}
        >
            <div className={cn(
                fullWidth ? 'w-full' : 'container mx-auto px-4'
            )}>
                {children}
            </div>
        </motion.section>
    );
} 