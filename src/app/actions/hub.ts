"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth, signIn } from "@/auth";
import { CredentialsSignin } from "next-auth";
import { ingestYoutubeVideo } from "@/lib/youtube-ingest";
import { prismaToUserMessage } from "@/lib/prisma-user-message";

export async function registerAndSignIn(formData: FormData): Promise<
  | { ok: true }
  | { ok: false; error: string }
> {
  const schema = z.object({
    name: z.string().min(1, "Enter a display name"),
    email: z.string().email(),
    password: z.string().min(8, "Use at least 8 characters"),
  });

  let data: z.infer<typeof schema>;
  try {
    data = schema.parse({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
  } catch {
    return { ok: false, error: "Check your name, email, and password" };
  }

  try {
    const exists = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (exists) return { ok: false, error: "That email is already registered." };

    const passwordHash = await bcrypt.hash(data.password, 12);
    await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
      },
    });

    const signResult = await signIn("credentials", {
      redirect: false,
      email: data.email.toLowerCase(),
      password: data.password,
    });

    if (
      typeof signResult === "object" &&
      signResult &&
      "error" in signResult &&
      signResult.error
    ) {
      return {
        ok: false,
        error: "Account created — sign-in failed. Try logging in manually.",
      };
    }

    return { ok: true };
  } catch (e) {
    console.error("[registerAndSignIn]", e);
    if (e instanceof CredentialsSignin) {
      return {
        ok: false,
        error:
          "Sign-in failed right after signup. Your account may still exist — try logging in manually.",
      };
    }
    return { ok: false, error: prismaToUserMessage(e) };
  }
}

export async function addYoutubeVideo(payload: {
  rawUrl: string;
}): Promise<
  | { ok: true; duplicate: boolean }
  | { ok: false; error: string }
> {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "You need to log in." };

  const rawUrl = payload.rawUrl?.trim();
  if (!rawUrl) return { ok: false, error: "Paste a YouTube URL first." };

  try {
    const result = await ingestYoutubeVideo(rawUrl, uid);
    revalidatePath("/hub");
    return { ok: true, duplicate: result.duplicate };
  } catch (e) {
    return { ok: false, error: prismaToUserMessage(e) };
  }
}

export async function addResource(payload: {
  url: string;
  title?: string;
  note?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "You need to log in." };

  const parsed = z
    .object({
      url: z.string().url(),
      title: z.string().max(200).optional(),
      note: z.string().max(2000).optional(),
    })
    .safeParse(payload);

  if (!parsed.success) {
    return { ok: false, error: "Use a full link (https://...)" };
  }

  try {
    await prisma.resource.create({
      data: {
        url: parsed.data.url,
        title: parsed.data.title?.trim() || null,
        note: parsed.data.note?.trim() || null,
        addedById: uid,
      },
    });

    revalidatePath("/hub");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: prismaToUserMessage(e) };
  }
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, "Current password looks too short."),
    newPassword: z.string().min(8, "Use at least 8 characters for your new password."),
    confirmPassword: z
      .string()
      .min(8, "Confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation do not match.",
    path: ["confirmPassword"],
  });

const changeDisplayNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a display name.")
    .max(80, "Use 80 characters or fewer."),
});

const watchlistItemSchema = z.object({
  companyName: z.string().trim().min(1, "Enter a company name.").max(200),
  ticker: z
    .string()
    .trim()
    .min(1, "Enter a ticker symbol.")
    .max(12)
    .regex(/^[A-Za-z0-9.-]+$/, "Ticker can only contain letters, numbers, dots, or dashes."),
  sector: z.string().trim().min(1, "Enter a sector or theme.").max(120),
  type: z.enum(["Stock", "ETF"]),
  thesis: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export async function changePassword(formData: FormData): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "You need to log in." };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      first.currentPassword?.[0] ??
      first.newPassword?.[0] ??
      first.confirmPassword?.[0] ??
      "Check your passwords and try again.";
    return { ok: false, error: msg };
  }

  if (parsed.data.newPassword === parsed.data.currentPassword) {
    return {
      ok: false,
      error: "New password must be different from your current password.",
    };
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user) return { ok: false, error: "Account not found." };

    const matches = await bcrypt.compare(
      parsed.data.currentPassword,
      user.passwordHash
    );
    if (!matches) {
      return { ok: false, error: "Current password is incorrect." };
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({
      where: { id: uid },
      data: { passwordHash },
    });

    revalidatePath("/hub/profile");
    revalidatePath("/hub");
    return { ok: true };
  } catch (e) {
    console.error("[changePassword]", e);
    return { ok: false, error: prismaToUserMessage(e) };
  }
}

export async function changeDisplayName(formData: FormData): Promise<
  { ok: true; name: string } | { ok: false; error: string }
> {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "You need to log in." };

  const parsed = changeDisplayNameSchema.safeParse({
    name: String(formData.get("name") ?? ""),
  });

  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.name?.[0];
    return { ok: false, error: msg ?? "Check your display name and try again." };
  }

  try {
    const user = await prisma.user.update({
      where: { id: uid },
      data: { name: parsed.data.name },
      select: { name: true },
    });

    revalidatePath("/hub/profile");
    revalidatePath("/hub");
    return { ok: true, name: user.name ?? parsed.data.name };
  } catch (e) {
    console.error("[changeDisplayName]", e);
    return { ok: false, error: prismaToUserMessage(e) };
  }
}

export async function addWatchlistItem(payload: {
  companyName: string;
  ticker: string;
  sector: string;
  type: "Stock" | "ETF";
  thesis?: string;
  notes?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "You need to log in." };

  const parsed = watchlistItemSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      first.companyName?.[0] ??
      first.ticker?.[0] ??
      first.sector?.[0] ??
      first.type?.[0] ??
      "Check the watchlist fields and try again.";
    return { ok: false, error: msg };
  }

  const ticker = parsed.data.ticker.toUpperCase();

  try {
    const existing = await prisma.watchlistItem.findUnique({
      where: { ticker },
    });
    if (existing) {
      return { ok: false, error: `${ticker} is already on the watchlist.` };
    }

    await prisma.watchlistItem.create({
      data: {
        ticker,
        companyName: parsed.data.companyName,
        sector: parsed.data.sector,
        type: parsed.data.type,
        thesis: parsed.data.thesis ?? "",
        notes: parsed.data.notes ?? null,
        addedById: uid,
      },
    });

    revalidatePath("/hub");
    return { ok: true };
  } catch (e) {
    console.error("[addWatchlistItem]", e);
    return { ok: false, error: prismaToUserMessage(e) };
  }
}

export async function deleteWatchlistItem(payload: {
  id: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "You need to log in." };

  const id = payload.id?.trim();
  if (!id) return { ok: false, error: "Missing watchlist item." };

  try {
    const item = await prisma.watchlistItem.findUnique({ where: { id } });
    if (!item) return { ok: false, error: "That watchlist item was not found." };

    await prisma.watchlistItem.delete({ where: { id } });
    revalidatePath("/hub");
    return { ok: true };
  } catch (e) {
    console.error("[deleteWatchlistItem]", e);
    return { ok: false, error: prismaToUserMessage(e) };
  }
}

export async function toggleVideoWatched(payload: {
  videoId: string;
}): Promise<{ ok: true; watched: boolean } | { ok: false; error: string }> {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "You need to log in." };

  const videoId = payload.videoId?.trim();
  if (!videoId) return { ok: false, error: "Missing video id." };

  try {
    const existing = await prisma.videoWatch.findUnique({
      where: { userId_videoId: { userId: uid, videoId } },
    });

    if (existing) {
      await prisma.videoWatch.delete({
        where: { id: existing.id },
      });
      revalidatePath("/hub");
      return { ok: true, watched: false };
    }

    await prisma.videoWatch.create({
      data: { userId: uid, videoId },
    });
    revalidatePath("/hub");
    return { ok: true, watched: true };
  } catch (e) {
    return { ok: false, error: prismaToUserMessage(e) };
  }
}
