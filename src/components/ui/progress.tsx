import { cn } from "@/lib/utils";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as React from "react";

type ProgressProps = React.ComponentPropsWithoutRef<
	typeof ProgressPrimitive.Root
> & {
	indicatorClassName?: string;
};

const Progress = React.forwardRef<
	React.ElementRef<typeof ProgressPrimitive.Root>,
	ProgressProps
>(({ className, value, indicatorClassName, ...props }, ref) => (
	<ProgressPrimitive.Root
		ref={ref}
		className={cn(
			"theme-surface-alt relative h-5 w-full overflow-hidden border-3 border-foreground neo-shadow",
			className,
		)}
		{...props}
	>
		<ProgressPrimitive.Indicator
			className={cn(
				"theme-bg-amber h-full w-full flex-1 brutal-transition",
				indicatorClassName,
			)}
			style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
		/>
	</ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
