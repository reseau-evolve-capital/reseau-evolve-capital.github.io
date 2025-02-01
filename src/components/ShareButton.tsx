'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShare2, FiX } from 'react-icons/fi';
import { FaTwitter, FaWhatsapp } from 'react-icons/fa';
import { PiThreadsLogoFill } from 'react-icons/pi';
import { FiMail } from 'react-icons/fi';

type ShareOption = {
    icon: React.ReactNode;
    label: string;
    color: string;
    shareUrl: (url: string, title: string) => string;
};

const shareOptions: ShareOption[] = [
    {
        icon: <FaTwitter size={20} />,
        label: 'Twitter',
        color: 'bg-[#1DA1F2]',
        shareUrl: (url, title) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
    },
    {
        icon: <FaWhatsapp size={20} />,
        label: 'WhatsApp',
        color: 'bg-[#25D366]',
        shareUrl: (url, title) => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`
    },
    {
        icon: <PiThreadsLogoFill size={20} />,
        label: 'Threads',
        color: 'bg-black',
        shareUrl: (url, title) => `https://threads.net/intent/post?text=${encodeURIComponent(`${title} ${url}`)}`
    },
    {
        icon: <FiMail size={20} />,
        label: 'Email',
        color: 'bg-gray-600',
        shareUrl: (url, title) => `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check out this project: ${url}`)}`
    }
];

export function ShareButton({ title }: { title: string }) {
    const [isOpen, setIsOpen] = useState(false);

    const handleShare = (option: ShareOption) => {
        const url = window.location.href;
        window.open(option.shareUrl(url, title), '_blank');
    };

    return (
        <div className="relative">
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                {isOpen ? <FiX size={20} /> : <FiShare2 size={20} />}
                <span className="text-sm font-medium">Share</span>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 mt-2 p-2 bg-white rounded-xl shadow-lg z-50 min-w-[200px]"
                    >
                        <div className="flex flex-col gap-1">
                            {shareOptions.map((option) => (
                                <motion.button
                                    key={option.label}
                                    onClick={() => handleShare(option)}
                                    className={`flex items-center gap-3 px-4 py-2 rounded-lg text-white ${option.color} hover:opacity-90 transition-opacity w-full`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {option.icon}
                                    <span className="text-sm font-medium">{option.label}</span>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
} 