'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Section } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select, Checkbox } from '@/components/ui/FormElements'
import type { ContactFormSection as ContactFormSectionData } from '@/lib/content-types'
import type { SectionProps } from '@/components/sections/components'
import { copy } from '@/lib/copy'
import Image from 'next/image'
import { submitContactForm, validateContactForm, type ContactFormData } from '@/lib/contact'
import { analyticsEvents } from '@/lib/analytics'

type FormValues = {
  name: string
  email: string
  subject: string
  message: string
  newsletter: boolean
}

type FormErrors = Partial<Record<keyof FormValues, string>>

export function ContactFormSection({ data, ctx }: SectionProps<ContactFormSectionData>) {
  const { locale } = ctx
  const t = copy[locale]
  const [formValues, setFormValues] = useState<FormValues>({
    name: '',
    email: '',
    subject: '',
    message: '',
    newsletter: false,
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormValues((prev) => ({ ...prev, [name]: value }))

    // Clear error when user types
    if (formErrors[name as keyof FormValues]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormValues((prev) => ({ ...prev, newsletter: checked }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }))

    // Clear error when user selects
    if (formErrors[name as keyof FormValues]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate the form using our utility function
    const { isValid, errors } = validateContactForm(formValues, locale)
    if (!isValid) {
      setFormErrors(errors)
      return
    }

    setIsSubmitting(true)

    try {
      // Submit the form data using our API utility
      const response = await submitContactForm({
        ...formValues,
        locale,
        source: 'contact_page',
      } as ContactFormData)

      if (response.status === 'success') {
        // Form submitted successfully
        setIsSubmitted(true)
        setFormValues({ name: '', email: '', subject: '', message: '', newsletter: false })
        // 🎯 contact_form_submit (key event) — lead capté. Aucune donnée du formulaire envoyée.
        analyticsEvents.contact.submit('contact_page')
      } else {
        throw new Error(response.message || 'Submission failed')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      analyticsEvents.contact.error('network')
      setFormErrors({
        ...formErrors,
        message: t.formError,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

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
            <h2 className="text-2xl font-heading mb-6 text-center">{data.title}</h2>

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
                  {t.formSuccessTitle}
                </h3>
                <p className="text-neutral-600 mb-6">
                  {t.formSuccessText}
                </p>
                <Button onClick={() => setIsSubmitted(false)} type="button">
                  {t.sendAnother}
                </Button>
              </motion.div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                {data.formFields.map((field) => {
                  const fieldName = field.name as keyof FormValues
                  const error = formErrors[fieldName]

                  switch (field.type) {
                    case 'text':
                      return (
                        <Input
                          key={field.name}
                          name={field.name}
                          label={field.label}
                          placeholder={field.label}
                          value={String(formValues[fieldName] || '')}
                          onChange={handleInputChange}
                          required={Boolean(field.required)}
                          error={error}
                        />
                      )
                    case 'email':
                      return (
                        <Input
                          key={field.name}
                          type="email"
                          name={field.name}
                          label={field.label}
                          placeholder={field.label}
                          value={String(formValues[fieldName] || '')}
                          onChange={handleInputChange}
                          required={Boolean(field.required)}
                          error={error}
                        />
                      )
                    case 'textarea':
                      return (
                        <Textarea
                          key={field.name}
                          name={field.name}
                          label={field.label}
                          placeholder={field.label}
                          value={String(formValues[fieldName] || '')}
                          onChange={handleInputChange}
                          required={Boolean(field.required)}
                          error={error}
                        />
                      )
                    case 'select':
                      return (
                        <Select
                          key={field.name}
                          name={field.name}
                          label={field.label}
                          value={String(formValues[fieldName] || '')}
                          onChange={(value) => handleSelectChange(field.name, value)}
                          options={field.options.map((option) => ({ value: option.value, label: option.label }))}
                          required={Boolean(field.required)}
                          error={error}
                        />
                      )
                    default:
                      return null
                  }
                })}

                {/* Newsletter opt-in checkbox */}
                <Checkbox
                  id="newsletter"
                  name="newsletter"
                  checked={formValues.newsletter}
                  onChange={handleCheckboxChange}
                  label={t.newsletterOptIn}
                />

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    {data.submitLabel}
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
                  alt={t.contactIllustrationAlt}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="mt-6 text-center">
                <h3 className="text-xl font-heading mb-2">
                  {t.communityTitle}
                </h3>
                <p className="text-neutral-300">
                  {t.communityText}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Section>
  )
}
