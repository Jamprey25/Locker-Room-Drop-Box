"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  changeDisplayName,
  changeEmail,
  changePassword,
} from "@/app/actions/hub";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { FieldGroup, Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export function ProfileClient(props: {
  initialName: string;
  email: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(props.initialName);
  const [email, setEmail] = useState(props.email);
  const [namePending, startName] = useTransition();
  const [emailPending, startEmail] = useTransition();
  const [passwordPending, startPassword] = useTransition();

  function handleNameSubmit(form: HTMLFormElement) {
    startName(async () => {
      const fd = new FormData(form);
      const res = await changeDisplayName(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      setName(res.name);
      toast("Display name updated.", "success");
      router.refresh();
    });
  }

  function handleEmailSubmit(form: HTMLFormElement) {
    startEmail(async () => {
      const fd = new FormData(form);
      const res = await changeEmail(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      setEmail(res.email);
      const passwordInput = form.querySelector<HTMLInputElement>(
        '[name="currentPassword"]'
      );
      if (passwordInput) passwordInput.value = "";
      toast("Email updated.", "success");
      router.refresh();
    });
  }

  function handlePasswordSubmit(form: HTMLFormElement) {
    startPassword(async () => {
      const fd = new FormData(form);
      const res = await changePassword(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      form.reset();
      toast("Password updated.", "success");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Update your display name, email, and password."
      />

      <Card>
        <CardContent>
          <CardTitle className="mb-6">Display name</CardTitle>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleNameSubmit(e.currentTarget);
            }}
            className="flex flex-col gap-5"
          >
            <FieldGroup>
              <Label label="Username" htmlFor="profile-name" className="sm:col-span-2">
                <Input
                  id="profile-name"
                  name="name"
                  required
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Jordan"
                />
              </Label>
            </FieldGroup>
            <Button
              type="submit"
              disabled={namePending || name.trim() === props.initialName.trim()}
              className="w-fit"
            >
              {namePending ? "Saving…" : "Save display name"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <CardTitle className="mb-6">Email</CardTitle>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleEmailSubmit(e.currentTarget);
            }}
            className="flex flex-col gap-5"
          >
            <FieldGroup>
              <Label label="Email address" htmlFor="profile-email" className="sm:col-span-2">
                <Input
                  id="profile-email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </Label>
              <Label label="Current password" htmlFor="email-current-password" className="sm:col-span-2">
                <Input
                  id="email-current-password"
                  name="currentPassword"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="current-password"
                />
              </Label>
            </FieldGroup>
            <Button
              type="submit"
              disabled={emailPending || email.trim().toLowerCase() === props.email.toLowerCase()}
              className="w-fit"
            >
              {emailPending ? "Saving…" : "Update email"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <CardTitle className="mb-6">Change password</CardTitle>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePasswordSubmit(e.currentTarget);
            }}
            className="flex flex-col gap-5"
          >
            <FieldGroup>
              <Label label="Current password" htmlFor="current-password" className="sm:col-span-2">
                <Input
                  id="current-password"
                  name="currentPassword"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="current-password"
                />
              </Label>
              <Label label="New password" htmlFor="new-password">
                <Input
                  id="new-password"
                  name="newPassword"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </Label>
              <Label label="Confirm new password" htmlFor="confirm-password">
                <Input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </Label>
            </FieldGroup>
            <Button type="submit" disabled={passwordPending} className="w-fit">
              {passwordPending ? "Saving…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
