import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-8 md:px-8 md:pt-12">
      <Skeleton className="mb-10 h-12 w-48" />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-none border-2 p-5"
            style={{ borderColor: "var(--border-default)" }}
          >
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-10 w-16" />
          </div>
        ))}
      </div>
      <div
        className="mb-6 flex gap-2 border-b-2"
        style={{ borderColor: "var(--border-default)" }}
      >
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-none border-2 p-4"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
