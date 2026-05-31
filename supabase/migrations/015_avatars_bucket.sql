-- 015_avatars_bucket.sql — Bucket Storage des avatars de profil (AUT-006 step-2).
-- Lecture publique (affichage annuaire), écriture restreinte au dossier de l'utilisateur :
-- chemin = avatars/{auth.uid()}/<fichier>.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars: public read"  ON storage.objects;
DROP POLICY IF EXISTS "avatars: self write"   ON storage.objects;
DROP POLICY IF EXISTS "avatars: self update"  ON storage.objects;
DROP POLICY IF EXISTS "avatars: self delete"  ON storage.objects;

CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars: self write"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars: self update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars: self delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
