export { hasVoted, submitVote, getPollResults } from './client.ts'
export { mapPollResults } from './mappers/pollResults.mapper.ts'
export type {
  PollQuestionType,
  PollResultsVisibility,
  PollStatus,
  PollOption,
  PollOptionResult,
  PollOptionResultDTO,
  PollResults,
  PollResultsDTO,
} from './types.ts'
