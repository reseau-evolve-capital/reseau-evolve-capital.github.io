'use client';

import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";
import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, keyof ButtonHTMLAttributes<HTMLButtonElement>>, ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'outline' | 'ghost' | 'link' | 'secondary';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    isLoading?: boolean;
    className?: string;
    children?: React.ReactNode;
    disabled?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
    className,
    children,
    variant = 'default',
    size = 'default',
    isLoading = false,
    disabled,
    ...props
}, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
        default: "bg-gradient-to-r from-[#F3903F] to-[#E93E3A] text-white shadow hover:opacity-90",
        secondary: "bg-gradient-to-r from-[#FFF33B] to-[#FDC70C] text-neutral-900 shadow hover:opacity-90",
        outline: "border-2 border-neutral-200 bg-transparent hover:bg-neutral-100 text-neutral-900",
        ghost: "hover:bg-neutral-100 text-neutral-900",
        link: "text-neutral-900 underline-offset-4 hover:underline"
    };

    const sizes = {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-md px-8 text-lg",
        icon: "h-10 w-10"
    };

    return (
        // @ts-expect-error button is not a valid HTMLMotionProps
        <motion.button
            ref={ref}
            whileTap={{ scale: 0.98 }}
            className={cn(
                baseStyles,
                variants[variant],
                sizes[size],
                className
            )}
            disabled={isLoading || disabled}
            {...props}
        >
            {isLoading && (
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                />
            )}
            {children}
        </motion.button>
    );
});

Button.displayName = "Button";

export { Button };