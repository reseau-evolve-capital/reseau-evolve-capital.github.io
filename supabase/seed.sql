-- Seed local Supabase — données de développement.
-- Vide pour l'instant : les clubs/membres sont importés via l'Edge Function sync (SHE-006).

-- Fixture E2E (AUT-009) : un club + un membre invité non onboardé.
INSERT INTO clubs (id, name, slug, sheet_id)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'Club E2E', 'club-e2e', 'sheet-e2e')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, full_name, onboarding_completed)
VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'test@example.com', 'Test Membre', false)
ON CONFLICT (email) DO NOTHING;

INSERT INTO memberships (user_id, club_id, role, joined_at)
VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'member', '2024-01-01')
ON CONFLICT (user_id, club_id) DO NOTHING;
