"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { registerAndSignIn } from "@/app/actions/hub";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <AuthShell subtitle="signup">
      <Card>
        <CardContent>
          <form
            className="flex flex-col gap-5"
            action={(fd) =>
              startTransition(async () => {
                setError(null);
                const res = await registerAndSignIn(fd);
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                router.push("/hub");
                router.refresh();
              })
            }
          >
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white">
                Join the locker
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                One signup per teammate. Everyone shares the same Videos and
                Resources after that.
              </p>
            </div>
            <Label label="Display name" htmlFor="signup-name">
              <Input
                id="signup-name"
                name="name"
                required
                maxLength={80}
                autoComplete="name"
                placeholder="Jordan"
              />
            </Label>
            <Label label="Email" htmlFor="signup-email">
              <Input
                id="signup-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </Label>
            <Label
              label="Password"
              htmlFor="signup-password"
              hint="At least 8 characters"
            >
              <Input
                id="signup-password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </Label>
            {error ? <Alert variant="error">{error}</Alert> : null}
            <Button type="submit" disabled={pending} className="mt-1 w-full">
              {pending ? "Creating your account…" : "Create account"}
            </Button>
            <p className="border-t border-white/[0.06] pt-5 text-center text-sm text-slate-500">
              Already in?{" "}
              <Link
                href="/login"
                className="font-semibold text-sky-400 hover:text-sky-300"
              >
                Log in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
