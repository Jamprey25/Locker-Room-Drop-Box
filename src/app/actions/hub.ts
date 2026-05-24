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
