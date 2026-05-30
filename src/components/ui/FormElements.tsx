'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className, ...props }, ref) => {
        return (
            <div className="space-y-2">
                {label && (
                    <label className="block font-medium text-neutral-700">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={cn(
                        "px-4 py-2 w-full border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F3903F] focus:border-transparent shadow-sm transition-colors",
                        error && "border-red-500 focus:ring-red-500",
                        className
                    )}
                    {...props}
                />
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-500"
                    >
                        {error}
                    </motion.p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, error, className, ...props }, ref) => {
        return (
            <div className="space-y-2">
                {label && (
                    <label className="block font-medium text-neutral-700">
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    className={cn(
                        "px-4 py-2 w-full border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F3903F] focus:border-transparent shadow-sm transition-colors min-h-[120px]",
                        error && "border-red-500 focus:ring-red-500",
                        className
                    )}
                    {...props}
                />
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-500"
                    >
                        {error}
                    </motion.p>
                )}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    label?: string;
    error?: string;
    options: { value: string; label: string }[];
    onChange?: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, options, className, onChange, ...props }, ref) => {
        const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            onChange?.(e.target.value);
        };

        return (
            <div className="space-y-2">
                {label && (
                    <label className="block font-medium text-neutral-700">
                        {label}
                    </label>
                )}
                <select
                    ref={ref}
                    className={cn(
                        "px-4 py-2 w-full border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F3903F] focus:border-transparent shadow-sm transition-colors",
                        error && "border-red-500 focus:ring-red-500",
                        className
                    )}
                    onChange={handleChange}
                    {...props}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-500"
                    >
                        {error}
                    </motion.p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
    label?: string;
    error?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ label, error, className, checked, onChange, ...props }, ref) => {
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            onChange(e.target.checked);
        };

        return (
            <div className="flex items-start">
                <div className="flex items-center h-5">
                    <input
                        type="checkbox"
                        ref={ref}
                        checked={checked}
                        onChange={handleChange}
                        className={cn(
                            "w-4 h-4 text-[#F3903F] bg-neutral-100 border-neutral-300 rounded focus:ring-[#F3903F] focus:ring-offset-0",
                            className
                        )}
                        {...props}
                    />
                </div>
                {label && (
                    <div className="ml-3 text-sm">
                        <label htmlFor={props.id} className="font-medium text-neutral-700">
                            {label}
                        </label>
                    </div>
                )}
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-500"
                    >
                        {error}
                    </motion.p>
                )}
            </div>
        );
    }
);

Checkbox.displayName = 'Checkbox'; 