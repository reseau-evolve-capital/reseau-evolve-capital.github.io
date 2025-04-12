'use client';

import { motion } from 'framer-motion';
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';
import { useRouter } from 'next/navigation';
import { type Locale, type StatItem as ConfigStatItem, pageContent } from '@/config/site-config';

interface StatItemProps extends ConfigStatItem {
    delay: number;
    locale: Locale;
}

function StatItem({ value, label, delay, locale }: StatItemProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.5 }}
            className="text-center"
        >
            <motion.div
                className="text-4xl md:text-5xl font-heading gradient-text mb-2"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: delay + 0.2, type: "spring" }}
            >
                {value}
            </motion.div>
            <div className="text-neutral-600">{label[locale]}</div>
        </motion.div>
    );
}

interface IntroductionProps {
    locale: Locale;
}

export function Introduction({ locale }: IntroductionProps) {
    const router = useRouter();
    const content = pageContent.home.introduction;

    return (
        <Section className="bg-neutral-50">
            <div className="max-w-4xl mx-auto text-center mb-16">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl md:text-4xl font-heading mb-6"
                >
                    {content.title[locale]}
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="text-lg text-neutral-600"
                >
                    {content.description[locale]}
                </motion.p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                {content.stats.map((stat, index) => (
                    <StatItem
                        key={stat.label[locale]}
                        value={stat.value}
                        label={stat.label}
                        delay={index * 0.1}
                        locale={locale}
                    />
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="text-center"
            >
                <Button
                    onClick={() => router.push(`/${locale}/about`)}
                    variant="outline"
                    size="lg"
                    className="group"
                >
                    {content.cta[locale]}
                    <motion.span
                        className="inline-block ml-2"
                        initial={{ x: 0 }}
                        whileHover={{ x: 5 }}
                    >
                        →
                    </motion.span>
                </Button>
            </motion.div>
        </Section>
    );
} 