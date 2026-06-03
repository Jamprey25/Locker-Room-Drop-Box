"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const rawCallback = params.get("callbackUrl");
  const callbackUrl =
    rawCallback &&
    rawCallback.startsWith("/") &&
    !rawCallback.startsWith("//")
      ? rawCallback
      : "/hub";
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardContent>
        <form
          className="flex flex-col gap-5"
          action={(fd) =>
            startTransition(async () => {
              setError(null);
              try {
                const res = await signIn("credentials", {
                  redirect: false,
                  email: String(fd.get("email")),
                  password: String(fd.get("password")),
                  callbackUrl,
                });
                if (res?.error) {
                  setError("Email or password did not match.");
                  return;
                }
                router.push(callbackUrl);
                router.refresh();
              } catch {
                setError(
                  "Sign-in service returned an unexpected response. Stop the dev server, run `rm -rf .next`, then `npm run dev` again. If this is production, confirm AUTH_SECRET is set in your host env."
                );
              }
            })
          }
        >
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Welcome back
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Use the email and password from when you joined the locker.
            </p>
          </div>
          <Label label="Email" htmlFor="login-email">
            <Input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </Label>
          <Label label="Password" htmlFor="login-password">
            <Input
              id="login-password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
            />
          </Label>
          {error ? <Alert variant="error">{error}</Alert> : null}
          <Button type="submit" disabled={pending} className="mt-1 w-full">
            {pending ? "Signing in…" : "Continue"}
          </Button>
          <p className="border-t border-white/[0.06] pt-5 text-center text-sm text-slate-500">
            New here?{" "}
            <Link
              href="/signup"
              className="font-semibold text-sky-400 hover:text-sky-300"
            >
              Create an account
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <AuthShell subtitle="login">
      <Suspense
        fallback={
          <div className="h-48 animate-pulse rounded-3xl border border-white/[0.06] bg-white/[0.02]" />
        }
      >
        <LoginInner />
      </Suspense>
    </AuthShell>
  );
}
