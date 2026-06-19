import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Welcome to BusLink",
};

export default function OnboardingLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <>{children}</>;
}
