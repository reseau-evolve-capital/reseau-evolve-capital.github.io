// Helper de création de snapshots d'import (table sheet_snapshots, DATA_MODEL §2.8).
// Chaque feuille produit un snapshot, même en cas d'échec (status partial/failed),
// pour l'audit et le rollback.

import type { SupabaseClient } from '@supabase/supabase-js'

export type SnapshotStatus = 'success' | 'partial' | 'failed'

/** SHA-256 hex de la sérialisation JSON des données brutes (Web Crypto, Deno-safe). */
export async function sha256Hex(value: unknown): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(value))
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Insère un snapshot pour une feuille. `rawData` peut être la matrice brute ou un
 * objet enrichi (ex: Portefeuille stocke ses lignes d'agrégat). `rowCount` est passé
 * explicitement car `rawData` n'est pas toujours un tableau (ex: objet { rows, aggregates }).
 */
export async function createSnapshot(
  supabase: SupabaseClient,
  clubId: string,
  sheetName: string,
  rawData: unknown,
  rowCount: number,
  status: SnapshotStatus,
  errorMessage?: string | null
): Promise<{ status: SnapshotStatus; checksum: string; row_count: number }> {
  const checksum = await sha256Hex(rawData)
  await supabase.from('sheet_snapshots').insert({
    club_id: clubId,
    sheet_name: sheetName,
    raw_data: rawData,
    row_count: rowCount,
    checksum,
    status,
    error_message: errorMessage ?? null,
  })
  return { status, checksum, row_count: rowCount }
}
