import { Step1Form } from './Step1Form'

// ?invited=1 → première connexion via une invitation (ADM-007) : accueil « Vous avez été invité ».
export default async function OnboardingStep1Page({
  searchParams,
}: {
  searchParams: Promise<{ invited?: string }>
}) {
  const { invited } = await searchParams
  return <Step1Form invited={invited === '1'} />
}
