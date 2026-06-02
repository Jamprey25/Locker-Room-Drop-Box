"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { MEETING_QUORUM } from "@/data/meetings";
import { sendMeetingConfirmationEmails } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { prismaToUserMessage } from "@/lib/prisma-user-message";

const voteSchema = z.object({
  meetingId: z.string().trim().min(1),
  agreed: z.boolean(),
});

const updateSchema = z.object({
  meetingId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).optional(),
  scheduledAt: z
    .string()
    .trim()
    .min(1)
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "Pick a valid date and time.",
    }),
});

function revalidateMeetings() {
  revalidatePath("/hub");
}

async function tryConfirmMeeting(meetingId: string): Promise<{
  confirmed: boolean;
  emailError?: string;
}> {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      votes: { where: { agreed: true } },
    },
  });

  if (!meeting || meeting.status === "confirmed") {
    return { confirmed: false };
  }

  const agreementCount = meeting.votes.length;
  if (agreementCount < MEETING_QUORUM) {
    return { confirmed: false };
  }

  const members = await prisma.user.findMany({
    select: { email: true },
    orderBy: { email: "asc" },
  });

  const confirmedAt = new Date();
  await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      status: "confirmed",
      confirmedAt,
    },
  });

  let emailError: string | undefined;
  if (!meeting.emailsSentAt) {
    const emailResult = await sendMeetingConfirmationEmails({
      title: meeting.title,
      scheduledAt: meeting.scheduledAt,
      notes: meeting.notes,
      recipientEmails: members.map((member) => member.email),
    });

    if (emailResult.ok) {
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { emailsSentAt: new Date() },
      });
    } else {
      emailError = emailResult.error;
    }
  }

  return { confirmed: true, emailError };
}

export async function voteOnMeetingTime(payload: z.infer<typeof voteSchema>) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return { ok: false as const, error: "You need to log in." };

  const parsed = voteSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid vote." };
  }

  const meeting = await prisma.meeting.findUnique({
    where: { id: parsed.data.meetingId },
    select: { id: true, status: true },
  });
  if (!meeting) {
    return { ok: false as const, error: "Meeting not found." };
  }
  if (meeting.status === "confirmed") {
    return {
      ok: false as const,
      error: "This meeting is already confirmed.",
    };
  }

  try {
    await prisma.meetingVote.upsert({
      where: {
        meetingId_userId: {
          meetingId: parsed.data.meetingId,
          userId: uid,
        },
      },
      create: {
        meetingId: parsed.data.meetingId,
        userId: uid,
        agreed: parsed.data.agreed,
      },
      update: {
        agreed: parsed.data.agreed,
        votedAt: new Date(),
      },
    });

    const votes = await prisma.meetingVote.findMany({
      where: { meetingId: parsed.data.meetingId },
      select: { agreed: true },
    });
    const agreementCount = votes.filter((vote) => vote.agreed).length;

    let confirmed = false;
    let emailError: string | undefined;
    if (agreementCount >= MEETING_QUORUM) {
      const result = await tryConfirmMeeting(parsed.data.meetingId);
      confirmed = result.confirmed;
      emailError = result.emailError;
    }

    revalidateMeetings();
    return {
      ok: true as const,
      agreementCount,
      quorumRequired: MEETING_QUORUM,
      confirmed,
      emailError,
    };
  } catch (error) {
    console.error("[voteOnMeetingTime]", error);
    return { ok: false as const, error: prismaToUserMessage(error) };
  }
}

export async function updateMeetingDetails(
  payload: z.infer<typeof updateSchema>
) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return { ok: false as const, error: "You need to log in." };

  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false as const,
      error:
        parsed.error.flatten().fieldErrors.title?.[0] ??
        parsed.error.flatten().fieldErrors.scheduledAt?.[0] ??
        "Check the meeting fields.",
    };
  }

  const meeting = await prisma.meeting.findUnique({
    where: { id: parsed.data.meetingId },
    select: { status: true },
  });
  if (!meeting) {
    return { ok: false as const, error: "Meeting not found." };
  }
  if (meeting.status === "confirmed") {
    return {
      ok: false as const,
      error: "Confirmed meetings cannot be edited.",
    };
  }

  try {
    await prisma.meeting.update({
      where: { id: parsed.data.meetingId },
      data: {
        title: parsed.data.title,
        notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
        scheduledAt: new Date(parsed.data.scheduledAt),
      },
    });

    revalidateMeetings();
    return { ok: true as const };
  } catch (error) {
    console.error("[updateMeetingDetails]", error);
    return { ok: false as const, error: prismaToUserMessage(error) };
  }
}

export async function removeMeetingVote(meetingId: string) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return { ok: false as const, error: "You need to log in." };

  const id = meetingId.trim();
  if (!id) return { ok: false as const, error: "Meeting not found." };

  try {
    await prisma.meetingVote.deleteMany({
      where: { meetingId: id, userId: uid },
    });
    revalidateMeetings();
    return { ok: true as const };
  } catch (error) {
    console.error("[removeMeetingVote]", error);
    return { ok: false as const, error: prismaToUserMessage(error) };
  }
}

const questionSchema = z.object({
  meetingId: z.string().trim().min(1),
  body: z.string().trim().min(1, "Add a note or question.").max(1000),
});

export async function addMeetingQuestion(
  payload: z.infer<typeof questionSchema>
) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return { ok: false as const, error: "You need to log in." };

  const parsed = questionSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false as const,
      error:
        parsed.error.flatten().fieldErrors.body?.[0] ??
        "Could not save that note.",
    };
  }

  const meeting = await prisma.meeting.findUnique({
    where: { id: parsed.data.meetingId },
    select: { id: true },
  });
  if (!meeting) {
    return { ok: false as const, error: "Meeting not found." };
  }

  try {
    await prisma.meetingQuestion.create({
      data: {
        meetingId: parsed.data.meetingId,
        userId: uid,
        body: parsed.data.body,
      },
    });
    revalidateMeetings();
    return { ok: true as const };
  } catch (error) {
    console.error("[addMeetingQuestion]", error);
    return { ok: false as const, error: prismaToUserMessage(error) };
  }
}

export async function deleteMeetingQuestion(questionId: string) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return { ok: false as const, error: "You need to log in." };

  const id = questionId.trim();
  if (!id) return { ok: false as const, error: "Note not found." };

  try {
    const question = await prisma.meetingQuestion.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!question) {
      return { ok: false as const, error: "Note not found." };
    }
    if (question.userId !== uid) {
      return { ok: false as const, error: "You can only delete your own notes." };
    }

    await prisma.meetingQuestion.delete({ where: { id } });
    revalidateMeetings();
    return { ok: true as const };
  } catch (error) {
    console.error("[deleteMeetingQuestion]", error);
    return { ok: false as const, error: prismaToUserMessage(error) };
  }
}
