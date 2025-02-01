'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';

export type FloatingElement = {
    image: string;
    size: number;
    delay: number;
    speed?: number;
    initialPosition?: {
        x: number;
        y: number;
    };
};

type FloatingElementsProps = {
    elements?: FloatingElement[];
};

export function FloatingElements({ elements = [] }: FloatingElementsProps) {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const animationsStarted = useRef<boolean>(false);

    useEffect(() => {
        // Set initial dimensions
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

        // Set animation started flag
        if (!animationsStarted.current) {
            animationsStarted.current = true;
        }

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const generatePath = (index: number) => {
        const points = [];
        const numPoints = 30;
        const verticalSpace = dimensions.height * 0.6; // Use 60% of screen height
        const verticalOffset = dimensions.height * 0.2; // Start at 20% from top

        // Calculate base Y position spread across vertical space
        const baseY = verticalOffset + (verticalSpace * (index / (elements.length + 1)));

        for (let i = 0; i <= numPoints; i++) {
            const x = (dimensions.width * i) / numPoints;
            const progress = i / numPoints;

            // Create a wave pattern that stays within bounds
            const waveY = Math.sin(progress * Math.PI * 2) * (verticalSpace * 0.1);
            const y = baseY + waveY;

            points.push([x, y]);
        }

        return points;
    };

    if (!animationsStarted.current || dimensions.width === 0) {
        return null;
    }

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {elements.map((element, index) => {
                const pathPoints = generatePath(index);

                return (
                    <motion.div
                        key={element.image}
                        className="absolute"
                        style={{
                            width: element.size,
                            height: element.size,
                            opacity: 0
                        }}
                        initial={{
                            opacity: 0,
                            x: -100,
                            y: pathPoints[0][1],
                            scale: 0.5,
                        }}
                        animate={{
                            opacity: 0.8,
                            scale: 1,
                            x: pathPoints.map(point => point[0]),
                            y: pathPoints.map(point => point[1]),
                        }}
                        transition={{
                            opacity: {
                                delay: element.delay,
                                duration: 1,
                            },
                            scale: {
                                delay: element.delay,
                                duration: 0.5,
                            },
                            default: {
                                delay: element.delay,
                                duration: element.speed || 20,
                                repeat: Infinity,
                                ease: "linear",
                                times: pathPoints.map((_, i) => i / pathPoints.length)
                            }
                        }}
                        whileHover={{
                            scale: 1.5,
                            transition: { duration: 0.3 }
                        }}
                    >
                        <motion.div
                            animate={{
                                rotate: [-2, 2]
                            }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                repeatType: "reverse",
                                ease: "easeInOut"
                            }}
                        >
                            <Image
                                src={element.image}
                                alt="Company Logo"
                                width={element.size}
                                height={element.size}
                                className="w-full h-full object-contain"
                            />
                        </motion.div>
                    </motion.div>
                );
            })}
        </div>
    );
}