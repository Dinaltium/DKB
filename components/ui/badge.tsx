import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";

const badgeVariants = cva(
	"inline-flex items-center rounded-none border-2 border-foreground px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide neo-shadow brutal-transition brutal-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground",
				secondary: "bg-secondary text-secondary-foreground",
				accent: "bg-accent text-accent-foreground",
				destructive: "bg-destructive text-destructive-foreground",
				success: "bg-success text-success-foreground",
				warning: "bg-warning text-warning-foreground",
				info: "bg-info text-info-foreground",
				outline: "bg-background text-foreground",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<div className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}

export { Badge, badgeVariants };
