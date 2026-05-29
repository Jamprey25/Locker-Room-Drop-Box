"use client";

import { useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page-header";
import { FieldGroup, Input, Label, Textarea } from "@/components/ui/input";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { formatDistance, formatPerson, friendlyHost } from "@/lib/format";
import type { HubResourceRow } from "@/components/hub/hub-client";

export function ResourcesTab({
  resources,
  pending,
  onAddResource,
}: {
  resources: HubResourceRow[];
  pending: boolean;
  onAddResource: (data: {
    url: string;
    title?: string;
    note?: string;
  }) => Promise<boolean>;
}) {
  const [fields, setFields] = useState({ url: "", title: "", note: "" });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void onAddResource({
      url: fields.url.trim(),
      title: fields.title.trim() || undefined,
      note: fields.note.trim() || undefined,
    }).then((ok) => {
      if (ok) setFields({ url: "", title: "", note: "" });
    });
  }

  return (
    <section className="flex flex-col gap-8">
      <Card>
        <CardContent>
          <CardTitle className="mb-6">New resource link</CardTitle>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <FieldGroup>
              <Label label="URL" htmlFor="resource-url" className="sm:col-span-2">
                <Input
                  id="resource-url"
                  name="url"
                  type="url"
                  required
                  value={fields.url}
                  onChange={(e) =>
                    setFields((f) => ({ ...f, url: e.target.value }))
                  }
                  placeholder="https://"
                />
              </Label>
              <Label label="Title" htmlFor="resource-title" optional>
                <Input
                  id="resource-title"
                  name="title"
                  value={fields.title}
                  onChange={(e) =>
                    setFields((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </Label>
              <div className="hidden sm:block" />
              <Label label="Notes" htmlFor="resource-note" optional className="sm:col-span-2">
                <Textarea
                  id="resource-note"
                  name="note"
                  rows={3}
                  value={fields.note}
                  onChange={(e) =>
                    setFields((f) => ({ ...f, note: e.target.value }))
                  }
                />
              </Label>
            </FieldGroup>
            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Saving…" : "Save resource"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {resources.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No resources yet"
          description="Add templates, underwriting PDFs, market intel links, or anything with a URL."
        />
      ) : (
        <Stagger className="flex flex-col gap-4">
          {resources.map((r) => (
            <StaggerItem key={r.id}>
              <Card
                hover
                className="border-white/[0.07] bg-white/[0.02] p-5 sm:p-6"
              >
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-2 text-lg font-semibold text-white decoration-sky-500/50 underline-offset-4 hover:text-sky-200 hover:underline"
                >
                  {r.title?.trim() || friendlyHost(r.url)}
                  <ExternalLink
                    className="h-4 w-4 text-slate-500 transition group-hover:text-sky-400"
                    aria-hidden
                  />
                </a>
                <p className="mt-2 break-all font-mono text-xs text-slate-500">
                  {r.url}
                </p>
                {r.note ? (
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    {r.note}
                  </p>
                ) : null}
                <p className="mt-4 text-xs text-slate-500">
                  Added by {formatPerson(r.addedBy)} ·{" "}
                  {formatDistance(r.createdAt)}
                </p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </section>
  );
}
