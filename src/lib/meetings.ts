import {
  EXPECTED_GROUP_SIZE,
  MEETING_QUORUM,
  MEETING_TIME_ZONE,
} from "@/data/meetings";

export type MeetingMemberRow = {
  id: string;
  name: string | null;
  email: string;
};

export type MeetingVoteRow = {
  userId: string;
  agreed: boolean;
  votedAt: Date;
  user: MeetingMemberRow;
};

export type MeetingRow = {
  id: string;
  title: string;
  notes: string | null;
  scheduledAt: Date;
  status: string;
  confirmedAt: Date | null;
  emailsSentAt: Date | null;
  createdAt: Date;
  votes: MeetingVoteRow[];
};

export type MeetingsData = {
  meeting: MeetingRow | null;
  members: MeetingMemberRow[];
  registeredCount: number;
  expectedGroupSize: number;
  quorumRequired: number;
  emailConfigured: boolean;
};

export function formatMeetingDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MEETING_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function countAgreements(votes: MeetingVoteRow[]): number {
  return votes.filter((vote) => vote.agreed).length;
}

export function meetingQuorumMet(
  agreementCount: number,
  quorumRequired = MEETING_QUORUM
): boolean {
  return agreementCount >= quorumRequired;
}

export function meetingSignupSummary(registeredCount: number): {
  label: string;
  complete: boolean;
} {
  const label = `${registeredCount} of ${EXPECTED_GROUP_SIZE} members signed up`;
  return { label, complete: registeredCount >= EXPECTED_GROUP_SIZE };
}

export function userVoteForMeeting(
  meeting: MeetingRow | null,
  userId: string
): MeetingVoteRow | undefined {
  return meeting?.votes.find((vote) => vote.userId === userId);
}
