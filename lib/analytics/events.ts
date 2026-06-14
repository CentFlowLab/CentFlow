/**
 * CentFlow Product Analytics — Event Catalog
 *
 * This file defines all tracked product events in a type-safe way.
 * Add new events here + wire the tracking call in the relevant UI/service layer.
 *
 * Naming conventions:
 * - Use snake_case
 * - Be specific but not overly verbose (e.g. receipt_scanned, not receipt_scan_successful)
 * - Include the main entity + the action
 */

export const AnalyticsEvents = {
  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',

  // Transactions & Receipts (core activation events)
  FIRST_TRANSACTION_CREATED: 'first_transaction_created',
  RECEIPT_SCANNED: 'receipt_scanned',

  // Assets / Ativos
  GOAL_CREATED: 'goal_created',
  WARRANTY_CREATED: 'warranty_created',
  ASSET_CREATED: 'asset_created',

  // Engagement / Settings
  SETTINGS_OPENED: 'settings_opened',
} as const;

export type AnalyticsEvent = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

/**
 * Strongly typed payloads for each event.
 * Properties should be as small and useful as possible for analysis.
 */
export type AnalyticsPayloads = {
  [AnalyticsEvents.ONBOARDING_STARTED]: undefined;

  [AnalyticsEvents.ONBOARDING_COMPLETED]: {
    /** True if the user used the "skip" path at any point */
    skipped?: boolean;
    /** The profile tags the user selected (e.g. ['savings', 'investing']) */
    profile_tags?: string[];
  };

  [AnalyticsEvents.ONBOARDING_SKIPPED]: {
    /** The step index (0-based) or step id where the user decided to skip */
    step?: number | string;
  };

  [AnalyticsEvents.FIRST_TRANSACTION_CREATED]: {
    type: 'income' | 'expense';
  };

  [AnalyticsEvents.RECEIPT_SCANNED]: {
    /** Number of line items extracted/saved from the receipt (0 when only header saved) */
    items_count: number;
    /** Whether any items came from OCR vs manual fill */
    has_ocr_items: boolean;
  };

  [AnalyticsEvents.GOAL_CREATED]: {
    /** Target amount in the user's currency (number, not formatted) */
    target_amount: number;
  };

  [AnalyticsEvents.WARRANTY_CREATED]: undefined;

  [AnalyticsEvents.ASSET_CREATED]: {
    /** Inventory category chosen by the user (e.g. 'electronics', 'furniture') */
    category?: string;
  };

  [AnalyticsEvents.SETTINGS_OPENED]: undefined;
};

/** Convenience type for a fully formed track call */
export type TrackEvent = <E extends AnalyticsEvent>(
  event: E,
  properties?: AnalyticsPayloads[E],
) => void;
