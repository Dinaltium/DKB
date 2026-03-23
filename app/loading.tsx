import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-8 md:px-8 md:pt-12">
      <div
        className="grid gap-6 rounded-none border-2 p-5 md:grid-cols-2"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-20 w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-11 w-36" />
            <Skeleton className="h-11 w-36" />
          </div>
        </div>
        <Skeleton className="aspect-[4/3] w-full rounded-none" />
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-none border-2 p-5"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div className="flex items-center gap-4">
              <Skeleton className="h-11 w-11 rounded-none" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-10">
        <Skeleton className="mb-4 h-6 w-48" />
        <Skeleton className="h-[420px] w-full rounded-none" />
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-none border-2 p-5"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div className="flex justify-between">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-5 w-16 rounded-none" />
            </div>
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-16 w-full rounded-none" />
            <Skeleton className="h-1.5 w-full rounded-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
