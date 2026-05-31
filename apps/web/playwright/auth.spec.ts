/**
 * Tests E2E — flow login → onboarding → dashboard (AUT-009)
 *
 * 5 scénarios :
 * 1. /dashboard sans session → /login
 * 2. email non invité → erreur « n'est pas encore invité »
 * 3. flow complet login → onboarding (step-1→2→3) → tour → dashboard
 * 4. token expiré → erreur + retour au login
 * 5. /admin en tant que member → /dashboard (redirect middleware)
 */

import { test, expect } from '@playwright/test'

import { generateMagicLink } from './helpers'

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 1 : /dashboard sans session → redirect /login
// ─────────────────────────────────────────────────────────────────────────────
test('/dashboard sans session → /login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 2 : email non invité → erreur
// ─────────────────────────────────────────────────────────────────────────────
test('email non invité → erreur', async ({ page }) => {
  await page.goto('/login')
  await page.getByPlaceholder('ton@email.com').fill('unknown@example.com')
  await page.getByRole('button', { name: /recevoir le lien/i }).click()
  await expect(page.getByText(/n'est pas encore invité/i)).toBeVisible({ timeout: 10_000 })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 3 : flow complet login → onboarding → dashboard
// ─────────────────────────────────────────────────────────────────────────────
test('flow complet login → onboarding → dashboard', async ({ page }) => {
  // Génère un magic link pour le membre de test (pré-importé en seed)
  const token = await generateMagicLink('test@example.com')

  // Accès à la page de vérification (simule le clic sur le lien email)
  await page.goto(`/login/verify?token_hash=${token}&type=email`)

  // Doit atterrir sur step-1 (onboarding_completed = false)
  await expect(page).toHaveURL(/\/onboarding\/step-1/, { timeout: 20_000 })

  // Step 1 : renseigner prénom + nom
  // FormField génère un <label htmlFor={id}> qui pointe sur l'Input.
  // exact:true nécessaire car 'Nom' est un sous-string de 'Prénom'
  // Attendre que le composant React soit hydraté et rendu
  await page.waitForSelector('input[autocomplete="given-name"]', { timeout: 15_000 })
  await page.getByPlaceholder('Votre prénom').fill('Léa')
  await page.getByPlaceholder('Votre nom de famille').fill('Martin')
  await page.getByRole('button', { name: /continuer/i }).click()

  // Step 2 : champs optionnels (téléphone, adresse), continuer directement
  await expect(page).toHaveURL(/\/onboarding\/step-2/, { timeout: 10_000 })
  await page.getByRole('button', { name: /continuer/i }).click()

  // Step 3 : consentement RGPD obligatoire + rejoindre
  await expect(page).toHaveURL(/\/onboarding\/step-3/, { timeout: 10_000 })
  // Le ConsentRow RGPD : label "J'accepte la charte de confidentialité..."
  // aria-labelledby pointe sur un <label> htmlFor=<id>, donc getByLabel fonctionne
  await page.getByLabel(/J'accepte la charte de confidentialité/).click()
  await page.getByRole('button', { name: /rejoindre le club/i }).click()

  // Tour d'onboarding
  await expect(page).toHaveURL(/\/onboarding\/tour/, { timeout: 15_000 })

  // Accéder au dashboard
  await page.getByRole('button', { name: /accéder à mon espace/i }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 4 : token expiré/invalide → erreur + retour au login
// ─────────────────────────────────────────────────────────────────────────────
test('token expiré → erreur + retour au login', async ({ page }) => {
  await page.goto('/login/verify?token_hash=invalide&type=email')

  // VerifyClient affiche le message d'erreur si verifyOtp échoue
  await expect(page.getByText(/ce lien a expiré/i)).toBeVisible({ timeout: 10_000 })

  // Bouton retour au login
  await page.getByRole('button', { name: /retour au login/i }).click()
  await expect(page).toHaveURL(/\/login$/)
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 5 : /admin en tant que member → redirect /dashboard
// ─────────────────────────────────────────────────────────────────────────────
test('/admin en tant que member → /dashboard', async ({ page }) => {
  // Se connecter d'abord (réutilise generate_link)
  const token = await generateMagicLink('test@example.com')
  await page.goto(`/login/verify?token_hash=${token}&type=email`)
  // Attendre d'être dans onboarding ou dashboard (le user a peut-être déjà onboardé dans test 3)
  await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 15_000 })

  // Accéder à /admin → doit être redirigé vers /dashboard (role member, pas staff)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
})
