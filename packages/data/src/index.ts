export { readSheet } from './sheets/client.ts'
export { mapBaseRowToMember } from './sheets/mappers/base.mapper.ts'
export { resolveBaseEmail, normalizeName } from './sheets/mappers/baseEmailResolution.ts'
export { mapParametragesToClub } from './sheets/mappers/parametrages.mapper.ts'
export { mapPortefeuilleRows, mapAggregateRows } from './sheets/mappers/portefeuille.mapper.ts'
export { mapHistoriqueRows } from './sheets/mappers/historique.mapper.ts'
export { mapCotisationsRows } from './sheets/mappers/cotisations.mapper.ts'
export { mapDetailsCotisationsRows } from './sheets/mappers/detailsCotisations.mapper.ts'
export { mapReportingRows } from './sheets/mappers/reporting.mapper.ts'
export * from './types/sheets.ts'
export { createBrowserClient } from './supabase/client.ts'
export { createServerClient } from './supabase/server.ts'
export { createServiceRoleClient } from './supabase/admin.ts'
export type { Database } from './supabase/types.gen.ts'
// Vote anonyme (migration 038)
export { hasVoted, submitVote, getPollResults, mapPollResults } from './polls/index.ts'
export type {
  PollQuestionType,
  PollResultsVisibility,
  PollStatus,
  PollOption,
  PollOptionResult,
  PollOptionResultDTO,
  PollResults,
  PollResultsDTO,
} from './polls/index.ts'
// Web Push (migration 039, PUSH-001) — dispatch server-only + templates de copy
export { dispatchNotification, buildNotificationContent } from './notifications/index.ts'
export type {
  NotificationEvent,
  NotificationEventType,
  NotificationContent,
  DispatchResult,
} from './notifications/index.ts'
