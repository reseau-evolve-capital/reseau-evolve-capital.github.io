// Tests Deno de l'Edge Function `on-user-first-login` (NTF-002).
//
// EXÉCUTION
// ---------
//     deno test --allow-env \
//       --config supabase/functions/on-user-first-login/deno.json \
//       supabase/functions/on-user-first-login/__tests__/on-user-first-login.test.ts
//
// (depuis la racine du repo). On importe `handler.ts` (logique pure, sans import
// du composant React Email ni de @evolve/design-system) : aucun I/O réel, aucun
// réseau — les 3 seams (createClient, sendBrevoEmail, renderWelcomeHtml) sont
// stubbés. `index.ts` (entrypoint prod) garde les imports lourds isolés.
//
// CE QUI EST TESTÉ
// ----------------
// 1. Idempotence : welcome_sent = true → AUCUN envoi Brevo, AUCUN update.
// 2. Assemblage du payload Brevo (to/subject/htmlContent) sur un premier login.
// 3. Bascule du drapeau welcome_sent → true après envoi réussi.
// 4. Pas d'envoi si l'envoi Brevo échoue : welcome_sent reste false (retry).

import { assert, assertEquals } from 'jsr:@std/assert@^1'

import { createWelcomeHandler } from '../handler.ts'
import type { BrevoEmailPayload, WelcomeDeps } from '../handler.ts'

// ---- Faux client Supabase minimal (en mémoire) ----
interface UserRow {
  id: string
  email: string | null
  full_name: string | null
  welcome_sent: boolean
}

interface Store {
  user: UserRow | null
  clubName: string | null
}

function makeFakeClient(store: Store) {
  // Query builder thenable minimal : couvre exactement les chaînes utilisées par
  // le handler (users.select().eq().maybeSingle(), memberships.select().eq().limit().maybeSingle(),
  // users.update().eq()).
  function usersSelect() {
    return {
      eq() {
        return this
      },
      maybeSingle() {
        return Promise.resolve({ data: store.user, error: null })
      },
    }
  }
  function membershipsSelect() {
    return {
      eq() {
        return this
      },
      limit() {
        return this
      },
      maybeSingle() {
        const data = store.clubName == null ? null : { clubs: { name: store.clubName } }
        return Promise.resolve({ data, error: null })
      },
    }
  }
  function usersUpdate(patch: Partial<UserRow>) {
    return {
      eq() {
        if (store.user) Object.assign(store.user, patch)
        return Promise.resolve({ error: null })
      },
    }
  }
  return {
    from(table: string) {
      if (table === 'users') {
        return {
          select: usersSelect,
          update: usersUpdate,
        }
      }
      if (table === 'memberships') {
        return { select: membershipsSelect }
      }
      throw new Error(`table inattendue: ${table}`)
    },
  }
}

function makeDeps(store: Store, opts: { brevoFails?: boolean } = {}) {
  const sent: BrevoEmailPayload[] = []
  const deps: WelcomeDeps = {
    createClient: (() => makeFakeClient(store)) as unknown as WelcomeDeps['createClient'],
    sendBrevoEmail: (payload) => {
      if (opts.brevoFails) return Promise.reject(new Error('Brevo 500'))
      sent.push(payload)
      return Promise.resolve()
    },
    renderWelcomeHtml: ({ memberFirstName, clubName }) =>
      Promise.resolve(`<html><body>Bienvenue ${memberFirstName} — ${clubName}</body></html>`),
  }
  return { deps, sent }
}

function req(body: unknown): Request {
  return new Request('http://local/on-user-first-login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// createClient est stubbé : les env vars sont inertes mais doivent exister.
Deno.env.set('SUPABASE_URL', 'http://localhost')
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key')

// ---- Test 1 — IDEMPOTENCE ----
Deno.test('idempotent : welcome_sent=true → aucun envoi, aucun update', async () => {
  const store: Store = {
    user: { id: 'u1', email: 'louis@example.com', full_name: 'Louis Martin', welcome_sent: true },
    clubName: 'Club A',
  }
  const { deps, sent } = makeDeps(store)
  const res = await createWelcomeHandler(deps)(req({ user_id: 'u1' }))
  const json = await res.json()

  assertEquals(res.status, 200)
  assertEquals(json.sent, false)
  assertEquals(json.reason, 'already_sent')
  assertEquals(sent.length, 0) // AUCUN appel Brevo
})

// ---- Test 2 — PREMIER LOGIN : payload Brevo + bascule du drapeau ----
Deno.test('premier login : assemble le payload Brevo et bascule welcome_sent', async () => {
  const store: Store = {
    user: { id: 'u2', email: 'louis@example.com', full_name: 'Louis Martin', welcome_sent: false },
    clubName: 'Les Investisseurs Audacieux',
  }
  const { deps, sent } = makeDeps(store)
  const res = await createWelcomeHandler(deps)(req({ user_id: 'u2' }))
  const json = await res.json()

  assertEquals(res.status, 200)
  assertEquals(json.sent, true)
  assertEquals(json.flagged, true)

  // Payload Brevo correctement assemblé.
  assertEquals(sent.length, 1)
  const payload = sent[0]
  assertEquals(payload.to[0].email, 'louis@example.com')
  assertEquals(payload.to[0].name, 'Louis Martin')
  assert(payload.subject.length > 0)
  // Le HTML contient le prénom (1er token) et le club.
  assert(payload.htmlContent.includes('Louis'))
  assert(payload.htmlContent.includes('Les Investisseurs Audacieux'))

  // Drapeau basculé en mémoire.
  assertEquals(store.user?.welcome_sent, true)
})

// ---- Test 3 — WEBHOOK auth (record.id) ----
Deno.test('accepte un payload webhook auth { record: { id } }', async () => {
  const store: Store = {
    user: { id: 'u3', email: 'a@b.fr', full_name: 'Awa Koné', welcome_sent: false },
    clubName: 'Club B',
  }
  const { deps, sent } = makeDeps(store)
  const res = await createWelcomeHandler(deps)(req({ record: { id: 'u3' } }))
  await res.json()
  assertEquals(res.status, 200)
  assertEquals(sent.length, 1)
})

// ---- Test 4 — ÉCHEC Brevo : drapeau NON basculé (retry possible) ----
Deno.test('échec Brevo : welcome_sent reste false (retry), HTTP 502', async () => {
  const store: Store = {
    user: { id: 'u4', email: 'c@d.fr', full_name: 'Zoé', welcome_sent: false },
    clubName: 'Club C',
  }
  const { deps, sent } = makeDeps(store, { brevoFails: true })
  const res = await createWelcomeHandler(deps)(req({ user_id: 'u4' }))
  await res.text()

  assertEquals(res.status, 502)
  assertEquals(sent.length, 0)
  assertEquals(store.user?.welcome_sent, false) // PAS basculé → retry au prochain login
})

// ---- Test 5 — utilisateur introuvable → 404 ----
Deno.test('utilisateur introuvable → 404', async () => {
  const store: Store = { user: null, clubName: null }
  const { deps } = makeDeps(store)
  const res = await createWelcomeHandler(deps)(req({ user_id: 'ghost' }))
  await res.json()
  assertEquals(res.status, 404)
})
