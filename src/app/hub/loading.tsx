export default function HubLoading() {
  return (
    <div className="mx-auto flex max-w-5xl animate-pulse flex-col gap-6 px-4 py-8">
      <div className="h-8 w-64 rounded-lg bg-zinc-800" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="aspect-video rounded-2xl bg-zinc-800" />
        <div className="aspect-video rounded-2xl bg-zinc-800" />
      </div>
      <div className="h-28 rounded-2xl bg-zinc-800" />
      <div className="h-48 rounded-2xl bg-zinc-800" />
    </div>
  );
}
