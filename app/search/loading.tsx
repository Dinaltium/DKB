import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-8 md:px-8 md:pt-12">
      <Skeleton className="mb-10 h-12 w-64" />
      <div
        className="space-y-3 rounded-lg border-2 p-4 md:p-6"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div className="grid gap-3 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-4 h-11 w-40" />
      </div>
      <div className="mt-8 space-y-4">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border-2 p-5"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_auto]">
              <div className="space-y-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="space-y-2">
                {[...Array(4)].map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
