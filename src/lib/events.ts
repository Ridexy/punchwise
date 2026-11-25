/** Shared allow-lists for the client tracker and the /api/e collector. */
export const EVENTS = [
  'calculator_opened', 'calculation_completed', 'share_button_clicked', 'share_link_copied',
  'share_card_downloaded', 'report_exported', 'invite_clicked', 'embed_code_copied',
] as const;
export const ATTRIBUTIONS = ['organic_search', 'direct', 'shared_result', 'coworker_invitation', 'embedded_calculator', 'other_referral'] as const;
export type EventName = (typeof EVENTS)[number];
export type Attribution = (typeof ATTRIBUTIONS)[number];
