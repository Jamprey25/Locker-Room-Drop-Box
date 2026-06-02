"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { CalendarClock, Check, Mail, Users, X } from "lucide-react";
import {
  removeMeetingVote,
  updateMeetingDetails,
  voteOnMeetingTime,
} from "@/app/actions/meetings";
import { MEETING_TIME_ZONE } from "@/data/meetings";
import {
  countAgreements,
  formatMeetingDateTime,
  meetingSignupSummary,
  type MeetingsData,
  userVoteForMeeting,
} from "@/lib/meetings";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page-header";
import { FieldGroup, Input, Label, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatPerson } from "@/lib/format";

function toLocalInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MEETING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function parseLocalInputValue(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return value;

  const [, year, month, day, hour, minute] = match;
  for (const offset of ["-04:00", "-05:00"]) {
    const iso = `${year}-${month}-${day}T${hour}:${minute}:00${offset}`;
    if (toLocalInputValue(new Date(iso)) === value) return iso;
  }

  return `${year}-${month}-${day}T${hour}:${minute}:00-04:00`;
}

function VoteBadge({
  agreed,
  pending,
}: {
  agreed: boolean | null;
  pending: boolean;
}) {
  if (agreed === true) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
        <Check className="h-3.5 w-3.5" aria-hidden />
        Agreed
      </span>
    );
  }
  if (agreed === false) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-medium text-rose-300">
        <X className="h-3.5 w-3.5" aria-hidden />
        Can&apos;t make it
      </span>
    );
  }
  return (
    <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-xs text-slate-500">
      {pending ? "Updating…" : "No vote yet"}
    </span>
  );
}

export function MeetingsTab({
  data,
  currentUserId,
  setupError,
}: {
  data: MeetingsData;
  currentUserId: string;
  setupError?: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const meeting = data.meeting;
  const signup = meetingSignupSummary(data.registeredCount);
  const agreementCount = meeting ? countAgreements(meeting.votes) : 0;
  const currentVote = userVoteForMeeting(meeting, currentUserId);
  const isConfirmed = meeting?.status === "confirmed";

  const [fields, setFields] = useState(() => ({
    title: meeting?.title ?? "",
    notes: meeting?.notes ?? "",
    scheduledAt: meeting ? toLocalInputValue(meeting.scheduledAt) : "",
  }));

  const voteByUserId = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const vote of meeting?.votes ?? []) {
      map.set(vote.userId, vote.agreed);
    }
    return map;
  }, [meeting?.votes]);

  function handleVote(agreed: boolean) {
    if (!meeting) return;
    start(async () => {
      const res = await voteOnMeetingTime({ meetingId: meeting.id, agreed });
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      if (res.confirmed) {
        toast(
          res.emailError
            ? `Meeting confirmed (${res.agreementCount}/${res.quorumRequired}), but emails failed: ${res.emailError}`
            : "Meeting confirmed — emails sent to the group.",
          res.emailError ? "error" : "success"
        );
      } else {
        toast(
          agreed ? "Your availability was recorded." : "Marked as unavailable.",
          "success"
        );
      }
      router.refresh();
    });
  }

  function handleClearVote() {
    if (!meeting) return;
    start(async () => {
      const res = await removeMeetingVote(meeting.id);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Vote cleared.", "success");
      router.refresh();
    });
  }

  function handleSaveDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!meeting) return;
    start(async () => {
      const res = await updateMeetingDetails({
        meetingId: meeting.id,
        title: fields.title.trim(),
        notes: fields.notes.trim() || undefined,
        scheduledAt: parseLocalInputValue(fields.scheduledAt),
      });
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Meeting details updated.", "success");
      router.refresh();
    });
  }

  if (setupError) {
    return (
      <Alert variant="error">
        <p className="font-semibold">Meetings setup required</p>
        <p className="mt-1">
          {setupError} Run <code className="text-sky-300">npm run db:push</code> or
          apply <code className="text-sky-300">scripts/create-meetings-tables.sql</code>{" "}
          in Supabase, then restart the dev server.
        </p>
      </Alert>
    );
  }

  if (!meeting) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No meeting scheduled"
        description="The default operating-agreement meeting could not be loaded."
      />
    );
  }

  return (
    <section className="flex flex-col gap-8">
      <Card className="border-white/[0.07] bg-white/[0.02]">
        <CardContent>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Group signup</CardTitle>
              <p className="mt-2 text-sm text-slate-400">
                {signup.label}. Everyone needs an account before they can vote.
              </p>
            </div>
            <div
              className={cn(
                "rounded-xl border px-4 py-3 text-sm",
                signup.complete
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                  : "border-amber-500/25 bg-amber-500/10 text-amber-100"
              )}
            >
              {signup.complete
                ? "All 10 members can vote."
                : "One member has not signed up yet — ask them to register."}
            </div>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {data.members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {formatPerson(member)}
                  </p>
                  <p className="truncate text-xs text-slate-500">{member.email}</p>
                </div>
                <VoteBadge agreed={voteByUserId.get(member.id) ?? null} pending={pending} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-white/[0.07] bg-white/[0.02]">
        <CardContent>
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>{meeting.title}</CardTitle>
              <p className="mt-2 text-sm text-slate-400">
                {formatMeetingDateTime(meeting.scheduledAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
                  isConfirmed
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-sky-500/15 text-sky-200"
                )}
              >
                <Users className="h-3.5 w-3.5" aria-hidden />
                {agreementCount}/{data.quorumRequired} agree
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs text-slate-300">
                {isConfirmed ? "Confirmed" : "Needs 8 of 10"}
              </span>
              {meeting.emailsSentAt ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs text-slate-300">
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  Emailed
                </span>
              ) : null}
            </div>
          </div>

          {!data.emailConfigured && !isConfirmed ? (
            <Alert variant="warning" className="mb-6">
              <p className="font-semibold">Email not configured</p>
              <p className="mt-1">
                Add <code className="text-sky-300">RESEND_API_KEY</code> and{" "}
                <code className="text-sky-300">RESEND_FROM_EMAIL</code> on Vercel so
                the group gets notified when 8 members agree.
              </p>
            </Alert>
          ) : null}

          {meeting.notes?.trim() && isConfirmed ? (
            <p className="mb-6 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3 text-sm leading-relaxed text-slate-300">
              {meeting.notes}
            </p>
          ) : null}

          {!isConfirmed ? (
            <>
              <form onSubmit={handleSaveDetails} className="mb-8 flex flex-col gap-5">
                <FieldGroup>
                  <Label label="Title" htmlFor="meeting-title" className="sm:col-span-2">
                    <Input
                      id="meeting-title"
                      value={fields.title}
                      onChange={(e) =>
                        setFields((current) => ({ ...current, title: e.target.value }))
                      }
                      required
                    />
                  </Label>
                  <Label
                    label="Proposed time (Eastern)"
                    htmlFor="meeting-time"
                  >
                    <Input
                      id="meeting-time"
                      type="datetime-local"
                      value={fields.scheduledAt}
                      onChange={(e) =>
                        setFields((current) => ({
                          ...current,
                          scheduledAt: e.target.value,
                        }))
                      }
                      required
                    />
                  </Label>
                  <Label
                    label="Notes"
                    htmlFor="meeting-notes"
                    optional
                    className="sm:col-span-2"
                  >
                    <Textarea
                      id="meeting-notes"
                      rows={4}
                      value={fields.notes}
                      onChange={(e) =>
                        setFields((current) => ({ ...current, notes: e.target.value }))
                      }
                      placeholder="Agenda, prep work, Zoom link, etc."
                    />
                  </Label>
                </FieldGroup>
                <Button type="submit" disabled={pending} className="w-fit">
                  {pending ? "Saving…" : "Save meeting details"}
                </Button>
              </form>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  disabled={pending || currentVote?.agreed === true}
                  onClick={() => handleVote(true)}
                >
                  I agree — this time works
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending || currentVote?.agreed === false}
                  onClick={() => handleVote(false)}
                >
                  I can&apos;t make this time
                </Button>
                {currentVote ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    onClick={handleClearVote}
                  >
                    Clear my vote
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-emerald-200">
              This time is locked in
              {meeting.confirmedAt
                ? ` since ${formatMeetingDateTime(meeting.confirmedAt)}`
                : ""}
              .
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
