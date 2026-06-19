"use client";

import { SettingsPage } from "@/components/blocks/application/settings-page";
import { AppShell } from "@/components/layout/AppShell";

export default function SettingsRoute() {
	return (
		<AppShell title="Settings" subtitle="Manage your account preferences">
			<SettingsPage />
		</AppShell>
	);
}
