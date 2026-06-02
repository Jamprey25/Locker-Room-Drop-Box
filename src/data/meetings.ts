/** Group size for quorum math (8 of 10 must agree). */
export const EXPECTED_GROUP_SIZE = 10;

/** Yes-votes required to confirm a meeting time. */
export const MEETING_QUORUM = 8;

/** Eastern Time — study group default for displayed meeting times. */
export const MEETING_TIME_ZONE = "America/New_York";

export const SEED_MEETING = {
  title: "Operating Agreement Discussion",
  notes: "",
  /** June 4, 2026 at 8:00 PM Eastern */
  scheduledAt: "2026-06-04T20:00:00-04:00",
} as const;
