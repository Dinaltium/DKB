import { cn } from "@/lib/utils";

function Skeleton({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"theme-surface-alt animate-pulse rounded-none border-2 border-foreground/20",
				className,
			)}
			{...props}
		/>
	);
}

export { Skeleton };
