"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-foreground">
      <p
        className="text-4xl font-black uppercase sm:text-5xl"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        Something went wrong
      </p>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex h-10 items-center rounded-none border-2 border-foreground bg-primary px-6 text-sm font-bold uppercase text-primary-foreground shadow-[3px_3px_0_hsl(var(--foreground))]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-none border-2 border-foreground bg-background px-6 text-sm font-bold uppercase text-foreground shadow-[2px_2px_0_hsl(var(--foreground))]"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
