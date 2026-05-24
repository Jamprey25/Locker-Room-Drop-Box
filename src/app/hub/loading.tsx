export default function HubLoading() {
  return (
    <div className="mx-auto flex max-w-6xl animate-pulse flex-col gap-10 px-5 py-10 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div className="h-3 w-24 rounded-full bg-white/10" />
          <div className="h-10 w-56 max-w-full rounded-xl bg-white/10" />
          <div className="h-4 w-full max-w-md rounded-lg bg-white/[0.07]" />
          <div className="h-4 w-4/5 max-w-sm rounded-lg bg-white/[0.05]" />
        </div>
        <div className="h-12 w-full max-w-[220px] rounded-full bg-white/[0.08]" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.03]">
          <div className="aspect-video bg-white/[0.06]" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-4/5 rounded-lg bg-white/10" />
            <div className="h-3 w-1/3 rounded bg-white/[0.07]" />
            <div className="h-10 w-full rounded-full bg-white/[0.06]" />
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.03]">
          <div className="aspect-video bg-white/[0.06]" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-3/4 rounded-lg bg-white/10" />
            <div className="h-3 w-2/5 rounded bg-white/[0.07]" />
            <div className="h-10 w-full rounded-full bg-white/[0.06]" />
          </div>
        </div>
      </div>
    </div>
  );
}
