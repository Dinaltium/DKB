import { useTheme } from "@/hooks/use-theme";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
	const { resolvedTheme } = useTheme();

	return (
		<Sonner
			theme={resolvedTheme as ToasterProps["theme"]}
			className="toaster group"
			toastOptions={{
				classNames: {
					toast:
						"group toast group-[.toaster]:theme-panel group-[.toaster]:border-3 group-[.toaster]:border-foreground group-[.toaster]:neo-shadow group-[.toaster]:rounded-none group-[.toaster]:font-bold",
					title:
						"group-[.toast]:font-black group-[.toast]:uppercase group-[.toast]:tracking-wide",
					description:
						"group-[.toast]:text-muted-foreground group-[.toast]:font-medium",
					actionButton:
						"group-[.toast]:theme-btn-primary group-[.toast]:border-2 group-[.toast]:border-foreground group-[.toast]:font-bold group-[.toast]:uppercase group-[.toast]:rounded-none group-[.toast]:neo-shadow group-[.toast]:brutal-transition group-[.toast]:hover:translate-x-[4px] group-[.toast]:hover:translate-y-[4px] group-[.toast]:hover:neo-shadow-none",
					cancelButton:
						"group-[.toast]:theme-btn-secondary group-[.toast]:border-2 group-[.toast]:border-foreground group-[.toast]:font-bold group-[.toast]:uppercase group-[.toast]:rounded-none",
					success:
						"group-[.toaster]:bg-success group-[.toaster]:text-success-foreground group-[.toaster]:border-foreground",
					error:
						"group-[.toaster]:bg-destructive group-[.toaster]:text-destructive-foreground group-[.toaster]:border-foreground",
					warning:
						"group-[.toaster]:bg-warning group-[.toaster]:text-warning-foreground group-[.toaster]:border-foreground",
					info: "group-[.toaster]:bg-info group-[.toaster]:text-info-foreground group-[.toaster]:border-foreground",
					closeButton:
						"group-[.toast]:theme-btn-secondary group-[.toast]:border-2 group-[.toast]:border-foreground group-[.toast]:rounded-none",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
