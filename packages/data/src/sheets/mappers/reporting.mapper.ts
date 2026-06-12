import { parseReportingDate } from '@evolve/utils'
import type { ReportingRowDTO, ClubReportingDailyUpsert } from '../../types/sheets.ts'

/**
 * Mappe les lignes REPORTING (série quotidienne club, DSH-011) en upserts
 * `club_reporting_daily`. PURE (Deno-safe), aucune I/O.
 *
 * RÈGLES :
 *  - Date (col A) via parseReportingDate (« dimanche, 03/05/2026 » → Date UTC) puis
 *    ISO 'yyyy-mm-dd'. Date non parseable → quarantaine MOLLE (skipped[], raison lisible).
 *  - B (valorisation) ou C (cotisations) manquant (null) ou négatif → quarantaine MOLLE
 *    (colonnes NOT NULL en DB, migration 034 — on n'invente jamais de valeur).
 *  - Enrichissement : D (plus-value) absent et B,C valides → capital_gain = B − C ;
 *    E (ratio) absent et C > 0 → performance_ratio = B / C. C = 0 (B ≥ 0 possible en
 *    tout début de série) → ratio sans sens, E reste null. Une valeur D/E FOURNIE par
 *    la feuille est toujours conservée telle quelle (la source fait foi).
 *  - Doublons de date : la DERNIÈRE ligne de la feuille gagne (Map indexée sur la date,
 *    écrasement en ordre de lecture) — cohérent avec l'upsert (club_id, report_date).
 */
export function mapReportingRows(
  rows: ReportingRowDTO[],
  clubId: string,
  syncedAt: string
): { upserts: ClubReportingDailyUpsert[]; skipped: string[] } {
  const byDate = new Map<string, ClubReportingDailyUpsert>()
  const skipped: string[] = []
  for (const row of rows) {
    const date = parseReportingDate(row.reportDateRaw)
    if (date == null) {
      skipped.push(`date illisible: "${row.reportDateRaw ?? ''}"`)
      continue
    }
    const reportDate = date.toISOString().slice(0, 10)
    const portfolioValue = row.portfolioValue
    const totalContributions = row.totalContributions
    if (
      portfolioValue == null ||
      portfolioValue < 0 ||
      totalContributions == null ||
      totalContributions < 0
    ) {
      skipped.push(
        `${reportDate}: valorisation/cotisations manquante(s) ou négative(s) ` +
          `(B=${portfolioValue ?? '∅'}, C=${totalContributions ?? '∅'})`
      )
      continue
    }
    byDate.set(reportDate, {
      club_id: clubId,
      report_date: reportDate,
      portfolio_value: portfolioValue,
      total_contributions: totalContributions,
      capital_gain: row.capitalGain ?? portfolioValue - totalContributions,
      performance_ratio:
        row.performanceRatio ??
        (totalContributions > 0 ? portfolioValue / totalContributions : null),
      synced_at: syncedAt,
    })
  }
  return { upserts: [...byDate.values()], skipped }
}
