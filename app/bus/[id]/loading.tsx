import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-8 md:px-8 md:pt-12">
      <Skeleton className="mb-10 h-12 w-48" />
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div
          className="space-y-3 rounded-lg border-2 p-5"
          style={{ borderColor: "var(--border-default)" }}
        >
          <Skeleton className="h-10 w-32" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        <div
          className="space-y-3 rounded-lg border-2 p-5"
          style={{ borderColor: "var(--border-default)" }}
        >
          <Skeleton className="h-8 w-48" />
          <div className="flex flex-wrap gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-7 w-16 rounded-md" />
            ))}
          </div>
        </div>
      </div>
      <Skeleton className="mb-6 h-72 w-full rounded-lg md:h-96" />
      <div className="grid gap-4 md:grid-cols-2">
        <div
          className="space-y-2 rounded-lg border-2 p-5"
          style={{ borderColor: "var(--border-default)" }}
        >
          <Skeleton className="mb-3 h-8 w-40" />
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
        <div
          className="space-y-3 rounded-lg border-2 p-5"
          style={{ borderColor: "var(--border-default)" }}
        >
          <Skeleton className="mb-3 h-8 w-40" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
