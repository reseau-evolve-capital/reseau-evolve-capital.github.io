'use client'

// Vue admin de création d'un vote (spec §8, maquette « 6 · PollCreateForm »). Branche
// PollCreateForm (organism) sur la Server Action createPollAction. action='draft' → brouillon,
// action='publish' → ouvert. Toast + redirection vers /admin/votes au succès ; toast d'erreur
// sinon (la copy d'erreur est i18n). Toute la copy du formulaire est injectée via `labels`.

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { PollCreateForm, useToast, type PollCreateAction, type PollCreatePayload } from '@evolve/ui'
import { createPollAction } from '../actions'
import { adminErrorMessage } from '../AdminPollsView'

export function AdminPollCreateView() {
  const t = useTranslations('votes.create')
  const tAdmin = useTranslations('votes.admin')
  const router = useRouter()
  const toast = useToast()
  const [, startTransition] = useTransition()

  function handleSubmit(payload: PollCreatePayload, action: PollCreateAction) {
    startTransition(async () => {
      const res = await createPollAction(payload, action)
      if (res.ok) {
        router.push('/admin/votes')
        router.refresh()
      } else {
        toast.error({ title: adminErrorMessage(res.error, tAdmin) })
      }
    })
  }

  return (
    <PollCreateForm
      onSubmit={handleSubmit}
      labels={{
        eyebrow: t('eyebrow'),
        step1Title: t('step1Title'),
        step2Title: t('step2Title'),
        titleLabel: t('titleLabel'),
        titlePlaceholder: t('titlePlaceholder'),
        descriptionLabel: t('descriptionLabel'),
        descriptionPlaceholder: t('descriptionPlaceholder'),
        typeSectionLabel: t('typeSectionLabel'),
        optionsLabel: t('optionsLabel'),
        optionPlaceholder: t('optionPlaceholder'),
        addOption: t('addOption'),
        removeOption: t('removeOption'),
        settingsLabel: t('settingsLabel'),
        resultsVisibilityLabel: t('resultsVisibilityLabel'),
        resultsVisibilityHint: t('resultsVisibilityHint'),
        notifyLabel: t('notifyLabel'),
        notifyHint: t('notifyHint'),
        closesAtLabel: t('closesAtLabel'),
        saveDraft: t('saveDraft'),
        publish: t('publish'),
        footerHint: t('footerHint'),
        next: t('next'),
        back: t('back'),
        types: {
          yes_no: { label: t('types.yes_no.label'), hint: t('types.yes_no.hint') },
          single_choice: {
            label: t('types.single_choice.label'),
            hint: t('types.single_choice.hint'),
          },
          multiple_choice: {
            label: t('types.multiple_choice.label'),
            hint: t('types.multiple_choice.hint'),
          },
          short_text: { label: t('types.short_text.label'), hint: t('types.short_text.hint') },
        },
      }}
    />
  )
}
