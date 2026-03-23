"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ModalFrame({
  title,
  onClose,
  children,
  max = "max-w-2xl",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  max?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 z-40 bg-black/60" aria-hidden />
      <div
        className={`z-50 flex max-h-[90vh] w-full flex-col rounded-none border-2 border-foreground bg-background shadow-[4px_4px_0_hsl(var(--foreground))] ${max}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b-2 border-foreground p-4">
          <p
            className="text-xl font-black uppercase tracking-wide text-foreground"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {title}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-none border-2 border-foreground font-black shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none"
          >
            ✕
          </Button>
        </div>
        <ScrollArea className="max-h-[min(80vh,720px)]">
          <div className="p-4">{children}</div>
        </ScrollArea>
      </div>
    </div>
  );
}
