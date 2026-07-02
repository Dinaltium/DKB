import type * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"theme-input brutal-transition brutal-focus flex field-sizing-content min-h-16 w-full rounded-none border-3 border-input px-3 py-2 text-base font-medium neo-shadow outline-none placeholder:text-muted-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
				className,
			)}
			{...props}
		/>
	);
}

export { Textarea };
