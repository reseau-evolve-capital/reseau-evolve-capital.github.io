'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select, Checkbox } from '@/components/ui/FormElements';
import { type Locale } from '@/config/site-config';
import { formConfig } from '@/config/form';
import { type LocalizedText } from '@/config/site-config';
import Image from 'next/image';
import { submitContactForm, validateContactForm, type ContactFormData } from '@/lib/contact';

interface ContactFormSectionProps {
    locale: Locale;
}

type FormValues = {
    name: string;
    email: string;
    subject: string;
    message: string;
    newsletter: boolean;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

export function ContactFormSection({ locale }: ContactFormSectionProps) {
    const { form } = formConfig;
    const [formValues, setFormValues] = useState<FormValues>({
        name: '',
        email: '',
        subject: '',
        message: '',
        newsletter: false,
    });
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormValues(prev => ({ ...prev, [name]: value }));
        
        // Clear error when user types
        if (formErrors[name as keyof FormValues]) {
            setFormErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleCheckboxChange = (checked: boolean) => {
        setFormValues(prev => ({ ...prev, newsletter: checked }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormValues(prev => ({ ...prev, [name]: value }));
        
        // Clear error when user selects
        if (formErrors[name as keyof FormValues]) {
            setFormErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate the form using our utility function
        const { isValid, errors } = validateContactForm(formValues, locale);
        if (!isValid) {
            setFormErrors(errors);
            return;
        }

        setIsSubmitting(true);
        
        try {
            // Submit the form data using our API utility
            const response = await submitContactForm({
                ...formValues,
                locale,
                source: 'contact_page'
            } as ContactFormData);
            
            if (response.status === 'success') {
                // Form submitted successfully
                setIsSubmitted(true);
                setFormValues({ name: '', email: '', subject: '', message: '', newsletter: false });
            } else {
                throw new Error(response.message || 'Submission failed');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            setFormErrors({
                ...formErrors,
                message: locale === 'fr' 
                    ? 'Une erreur est survenue. Veuillez réessayer.' 
                    : 'An error occurred. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getLocalizedLabel = (field: { label: LocalizedText }): string => {
        return field.label[locale];
    };

    return (
        <Section className="bg-gradient-to-br from-[#231F20] to-[#31292a] text-white">
            <div className="max-w-4xl mx-auto">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    {/* Form Column */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-white text-neutral-800 rounded-xl p-8 shadow-xl"
                    >
                        <h2 className="text-2xl font-heading mb-6 text-center">
                            {form.title[locale]}
                        </h2>

                        {isSubmitted ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-10"
                            >
                                <div className="w-20 h-20 mx-auto mb-6 text-green-500">
                                    <svg 
                                        xmlns="http://www.w3.org/2000/svg" 
                                        fill="none" 
                                        viewBox="0 0 24 24" 
                                        stroke="currentColor"
                                        className="w-full h-full"
                                    >
                                        <path 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                            strokeWidth={2} 
                                            d="M5 13l4 4L19 7" 
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-heading mb-2">
                                    {locale === 'fr' ? 'Message Envoyé !' : 'Message Sent!'}
                                </h3>
                                <p className="text-neutral-600 mb-6">
                                    {locale === 'fr' 
                                        ? 'Merci pour votre message. Nous vous répondrons dans les plus brefs délais.' 
                                        : 'Thank you for your message. We will respond as soon as possible.'}
                                </p>
                                <Button
                                    onClick={() => setIsSubmitted(false)}
                                    type="button"
                                >
                                    {locale === 'fr' ? 'Envoyer un autre message' : 'Send another message'}
                                </Button>
                            </motion.div>
                        ) : (
                            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                                {form.fields.map((field, index) => {
                                    const fieldName = field.label.en.toLowerCase().replace(/\s+/g, '') as keyof FormValues;
                                    
                                    switch (field.type) {
                                        case 'text':
                                            return (
                                                <Input
                                                    key={index}
                                                    name={fieldName === 'name' ? 'name' : String(fieldName)}
                                                    label={getLocalizedLabel(field)}
                                                    placeholder={getLocalizedLabel(field)}
                                                    value={String(formValues[fieldName as keyof FormValues] || '')}
                                                    onChange={handleInputChange}
                                                    required={field.required}
                                                    error={formErrors[fieldName as keyof FormValues]}
                                                />
                                            );
                                        case 'email':
                                            return (
                                                <Input
                                                    key={index}
                                                    type="email"
                                                    name="email"
                                                    label={getLocalizedLabel(field)}
                                                    placeholder={getLocalizedLabel(field)}
                                                    value={formValues.email}
                                                    onChange={handleInputChange}
                                                    required={field.required}
                                                    error={formErrors.email}
                                                />
                                            );
                                        case 'textarea':
                                            return (
                                                <Textarea
                                                    key={index}
                                                    name="message"
                                                    label={getLocalizedLabel(field)}
                                                    placeholder={getLocalizedLabel(field)}
                                                    value={formValues.message}
                                                    onChange={handleInputChange}
                                                    required={field.required}
                                                    error={formErrors.message}
                                                />
                                            );
                                        case 'select':
                                            return (
                                                <Select
                                                    key={index}
                                                    name="subject"
                                                    label={getLocalizedLabel(field)}
                                                    value={formValues.subject}
                                                    onChange={(value) => handleSelectChange('subject', value)}
                                                    options={
                                                        field.options?.map(option => ({
                                                            value: option.en.toLowerCase().replace(/\s+/g, '-'),
                                                            label: option[locale]
                                                        })) || []
                                                    }
                                                    required={field.required}
                                                    error={formErrors.subject}
                                                />
                                            );
                                        default:
                                            return null;
                                    }
                                })}
                                
                                {/* Newsletter opt-in checkbox */}
                                <Checkbox
                                    id="newsletter"
                                    name="newsletter"
                                    checked={formValues.newsletter}
                                    onChange={handleCheckboxChange}
                                    label={locale === 'fr' 
                                        ? 'Je souhaite recevoir la newsletter pour suivre les actualités du Réseau Evolve Capital' 
                                        : 'I would like to receive the newsletter to follow Réseau Evolve Capital news'}
                                />
                                
                                <div className="pt-4">
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        isLoading={isSubmitting}
                                        disabled={isSubmitting}
                                    >
                                        {form.submitButton[locale]}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </motion.div>

                    {/* Image/Illustration Column */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="hidden md:block"
                    >
                        <div className="p-6 bg-white bg-opacity-10 rounded-xl backdrop-filter backdrop-blur-sm">
                            <div className="relative h-[400px] w-full">
                                <Image
                                    src="/images/contact-illustration.svg"
                                    alt={locale === 'fr' ? 'Illustration de contact' : 'Contact illustration'}
                                    fill
                                    className="object-contain"
                                />
                            </div>
                            <div className="mt-6 text-center">
                                <h3 className="text-xl font-heading mb-2">
                                    {locale === 'fr' ? 'Rejoignez Notre Communauté d\'Investisseurs' : 'Join Our Investor Community'}
                                </h3>
                                <p className="text-neutral-300">
                                    {locale === 'fr' 
                                        ? 'Découvrez comment notre approche collective peut transformer votre parcours d\'investissement.'
                                        : 'Discover how our collective approach can transform your investment journey.'}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </Section>
    );
} 