'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function AnimatedBackground() {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        setDimensions({
            width: window.innerWidth,
            height: window.innerHeight
        });

        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Generate random points for the chart with upward trend
    const generateChartPath = (points: number, height: number, trend: number = 0.3) => {
        const segments = [];
        let x = 0;
        const step = dimensions.width / points;

        for (let i = 0; i <= points; i++) {
            const progress = i / points;
            // Add upward trend
            const trendY = dimensions.height * 0.6 - (progress * dimensions.height * trend);
            // Add random fluctuation
            const fluctuation = Math.sin(i * 0.5) * height + Math.random() * height * 0.3;
            const y = trendY + fluctuation;
            segments.push(`${i === 0 ? 'M' : 'L'} ${x},${y}`);
            x += step;
        }
        return segments.join(' ') + ` L ${dimensions.width},${dimensions.height} L 0,${dimensions.height} Z`;
    };

    return (
        <div className="absolute inset-0 -z-10 overflow-hidden">
            <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
            >
                <svg
                    className="w-full h-full"
                    viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                    preserveAspectRatio="none"
                >
                    <defs>
                        {/* Main chart gradient */}
                        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#22C55E', stopOpacity: 0.2 }} /> {/* Green for profit */}
                            <stop offset="50%" style={{ stopColor: '#F3903F', stopOpacity: 0.1 }} /> {/* Brand orange */}
                            <stop offset="100%" style={{ stopColor: '#E93E3A', stopOpacity: 0.05 }} /> {/* Brand red */}
                        </linearGradient>

                        {/* Line gradients */}
                        <linearGradient id="lineGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={{ stopColor: '#22C55E', stopOpacity: 0.5 }} /> {/* Green */}
                            <stop offset="100%" style={{ stopColor: '#FFF33B', stopOpacity: 0.5 }} /> {/* Brand yellow */}
                        </linearGradient>

                        <linearGradient id="lineGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={{ stopColor: '#F3903F', stopOpacity: 0.4 }} /> {/* Brand orange */}
                            <stop offset="100%" style={{ stopColor: '#E93E3A', stopOpacity: 0.4 }} /> {/* Brand red */}
                        </linearGradient>

                        {/* Grid gradient */}
                        <linearGradient id="gridGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={{ stopColor: '#F3903F', stopOpacity: 0.1 }} />
                            <stop offset="50%" style={{ stopColor: '#22C55E', stopOpacity: 0.1 }} />
                            <stop offset="100%" style={{ stopColor: '#F3903F', stopOpacity: 0.1 }} />
                        </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {[...Array(20)].map((_, i) => (
                        <motion.line
                            key={`grid-${i}`}
                            x1="0"
                            y1={i * (dimensions.height / 20)}
                            x2={dimensions.width}
                            y2={i * (dimensions.height / 20)}
                            stroke="url(#gridGradient)"
                            strokeWidth="1"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.05 }}
                        />
                    ))}

                    {/* Vertical grid lines */}
                    {[...Array(10)].map((_, i) => (
                        <motion.line
                            key={`vgrid-${i}`}
                            x1={i * (dimensions.width / 10)}
                            y1="0"
                            x2={i * (dimensions.width / 10)}
                            y2={dimensions.height}
                            stroke="url(#gridGradient)"
                            strokeWidth="1"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.1 }}
                        />
                    ))}

                    {/* Main chart area with upward trend */}
                    <motion.path
                        d={generateChartPath(30, dimensions.height * 0.15, 0.3)}
                        fill="url(#chartGradient)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1.5 }}
                    />

                    {/* Multiple trend lines */}
                    {[
                        { gradient: 'url(#lineGradient1)', height: 0.1, trend: 0.35 },
                        { gradient: 'url(#lineGradient2)', height: 0.08, trend: 0.25 }
                    ].map((line, i) => (
                        <motion.path
                            key={`line-${i}`}
                            d={generateChartPath(30, dimensions.height * line.height, line.trend)}
                            fill="none"
                            stroke={line.gradient}
                            strokeWidth="2"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{
                                duration: 2,
                                delay: i * 0.5,
                                ease: "easeInOut"
                            }}
                        />
                    ))}

                    {/* Price indicators */}
                    {[...Array(5)].map((_, i) => (
                        <motion.g key={`indicator-${i}`}>
                            <motion.circle
                                cx={dimensions.width * (0.2 + i * 0.15)}
                                cy={dimensions.height * (0.3 + Math.sin(i) * 0.1)}
                                r="4"
                                fill="#22C55E"
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{
                                    opacity: [0, 1, 0],
                                    scale: [0, 1.5, 0],
                                }}
                                transition={{
                                    duration: 3,
                                    delay: i * 0.3,
                                    repeat: Infinity,
                                }}
                            />
                        </motion.g>
                    ))}
                </svg>
            </motion.div>
        </div>
    );
} 