import { SEED_MEETING } from "@/data/meetings";
import type { MeetingsData } from "@/lib/meetings";
import { isEmailConfigured } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const memberSelect = {
  id: true,
  name: true,
  email: true,
} as const;

const voteInclude = {
  votes: {
    orderBy: { votedAt: "asc" as const },
    include: {
      user: { select: memberSelect },
    },
  },
} as const;

/** Seed the default operating-agreement meeting when none exist. */
export async function ensureMeetingSeeded(createdById: string): Promise<void> {
  const count = await prisma.meeting.count();
  if (count > 0) return;

  await prisma.meeting.create({
    data: {
      title: SEED_MEETING.title,
      notes: SEED_MEETING.notes || null,
      scheduledAt: new Date(SEED_MEETING.scheduledAt),
      status: "proposed",
      createdById,
    },
  });
}

export async function loadMeetingsData(): Promise<MeetingsData> {
  const [members, meeting] = await Promise.all([
    prisma.user.findMany({
      select: memberSelect,
      orderBy: { email: "asc" },
    }),
    prisma.meeting.findFirst({
      orderBy: { scheduledAt: "asc" },
      include: voteInclude,
    }),
  ]);

  return {
    meeting,
    members,
    registeredCount: members.length,
    expectedGroupSize: 10,
    quorumRequired: 8,
    emailConfigured: isEmailConfigured(),
  };
}
