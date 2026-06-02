"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { EXPENSE_CATEGORIES } from "@/lib/accounting";
import { prisma } from "@/lib/prisma";
import { prismaToUserMessage } from "@/lib/prisma-user-message";

const monthSchema = z.number().int().min(1).max(12);
const yearSchema = z.number().int().min(2000).max(2100);

const expenseSchema = z.object({
  year: yearSchema,
  month: monthSchema,
  amount: z.number().positive("Amount must be greater than zero."),
  category: z.string().trim().min(1, "Pick a category.").max(80),
  description: z.string().trim().max(500).optional(),
});

const shareSchema = z.object({
  ticker: z
    .string()
    .trim()
    .min(1)
    .max(12)
    .regex(/^[A-Za-z0-9.-]+$/)
    .transform((s) => s.toUpperCase()),
  companyName: z.string().trim().max(200).optional(),
  shareCount: z.number().positive("Share count must be greater than zero."),
  costBasis: z.number().nonnegative("Cost basis cannot be negative."),
  acquiredYear: yearSchema.optional(),
  acquiredMonth: monthSchema.optional(),
  notes: z.string().trim().max(500).optional(),
});

const settingsSchema = z.object({
  cashBalance: z.number(),
  otherAssets: z.number().nonnegative(),
  totalLiabilities: z.number().nonnegative(),
});

function revalidateAccounting() {
  revalidatePath("/hub");
}

export async function addBusinessExpense(payload: z.infer<typeof expenseSchema>) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return { ok: false as const, error: "You need to log in." };

  const parsed = expenseSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.flatten().fieldErrors.amount?.[0] ?? "Check the expense fields.",
    };
  }

  if (
    !EXPENSE_CATEGORIES.includes(
      parsed.data.category as (typeof EXPENSE_CATEGORIES)[number]
    ) &&
    parsed.data.category.length < 1
  ) {
    return { ok: false as const, error: "Pick a valid category." };
  }

  try {
    await prisma.businessExpense.create({
      data: {
        year: parsed.data.year,
        month: parsed.data.month,
        amount: parsed.data.amount,
        category: parsed.data.category,
        description: parsed.data.description ?? "",
        addedById: uid,
      },
    });
    revalidateAccounting();
    return { ok: true as const };
  } catch (e) {
    console.error("[addBusinessExpense]", e);
    return { ok: false as const, error: prismaToUserMessage(e) };
  }
}

export async function deleteBusinessExpense(payload: { id: string }) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "You need to log in." };

  try {
    await prisma.businessExpense.delete({ where: { id: payload.id } });
    revalidateAccounting();
    return { ok: true as const };
  } catch (e) {
    console.error("[deleteBusinessExpense]", e);
    return { ok: false as const, error: prismaToUserMessage(e) };
  }
}

export async function addSharePosition(payload: z.infer<typeof shareSchema>) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return { ok: false as const, error: "You need to log in." };

  const parsed = shareSchema.safeParse(payload);
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors.shareCount?.[0] ??
      parsed.error.flatten().fieldErrors.ticker?.[0] ??
      "Check the share fields.";
    return { ok: false as const, error: msg };
  }

  try {
    await prisma.sharePosition.create({
      data: {
        ticker: parsed.data.ticker,
        companyName: parsed.data.companyName ?? "",
        shareCount: parsed.data.shareCount,
        costBasis: parsed.data.costBasis,
        acquiredYear: parsed.data.acquiredYear ?? null,
        acquiredMonth: parsed.data.acquiredMonth ?? null,
        notes: parsed.data.notes ?? null,
        addedById: uid,
      },
    });
    revalidateAccounting();
    return { ok: true as const };
  } catch (e) {
    console.error("[addSharePosition]", e);
    return { ok: false as const, error: prismaToUserMessage(e) };
  }
}

export async function deleteSharePosition(payload: { id: string }) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "You need to log in." };

  try {
    await prisma.sharePosition.delete({ where: { id: payload.id } });
    revalidateAccounting();
    return { ok: true as const };
  } catch (e) {
    console.error("[deleteSharePosition]", e);
    return { ok: false as const, error: prismaToUserMessage(e) };
  }
}

export async function updateAccountingSettings(
  payload: z.infer<typeof settingsSchema>
) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "You need to log in." };

  const parsed = settingsSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false as const, error: "Check balance sheet inputs." };
  }

  try {
    await prisma.accountingSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        cashBalance: parsed.data.cashBalance,
        otherAssets: parsed.data.otherAssets,
        totalLiabilities: parsed.data.totalLiabilities,
      },
      update: {
        cashBalance: parsed.data.cashBalance,
        otherAssets: parsed.data.otherAssets,
        totalLiabilities: parsed.data.totalLiabilities,
      },
    });
    revalidateAccounting();
    return { ok: true as const };
  } catch (e) {
    console.error("[updateAccountingSettings]", e);
    return { ok: false as const, error: prismaToUserMessage(e) };
  }
}
