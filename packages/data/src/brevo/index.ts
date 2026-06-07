// Barrel Brevo (EDI-006). SERVER-ONLY — n'importer que depuis des routes API /
// Server Actions / Edge Functions (lit `BREVO_API_KEY`, jamais shippé au client).

export {
  sendTestEmail,
  findCampaignByName,
  createCampaign,
  sendCampaignNow,
  campaignName,
  TEST_SUBJECT_PREFIX,
} from './campaign.ts'
export type {
  BrevoSender,
  BrevoOptions,
  BrevoCampaign,
  SendTestEmailInput,
  CreateCampaignInput,
} from './campaign.ts'
