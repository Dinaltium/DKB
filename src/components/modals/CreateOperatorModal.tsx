"use client";

import { useState } from "react";
import { ModalFrame } from "@/components/modals/ModalFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateOperatorModal({
	onClose,
	onSubmit,
	isPending,
}: {
	onClose: () => void;
	onSubmit: (data: {
		companyName: string;
		email: string;
		password: string;
		phone?: string;
	}) => void;
	isPending: boolean;
}) {
	const [companyName, setCompanyName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [phone, setPhone] = useState("");

	return (
		<ModalFrame
			title="Create operator account"
			onClose={onClose}
			max="max-w-lg"
		>
			<form
				className="mt-3 space-y-2"
				onSubmit={(e) => {
					e.preventDefault();
					onSubmit({ companyName, email, password, phone: phone || undefined });
				}}
			>
				<Input
					required
					value={companyName}
					onChange={(e) => setCompanyName(e.target.value)}
					placeholder="Company / Operator Name"
					className="rounded-none border-2 border-foreground"
				/>
				<Input
					required
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="Email Address"
					className="rounded-none border-2 border-foreground"
				/>
				<Input
					required
					type="text"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="Temporary Password"
					className="rounded-none border-2 border-foreground"
				/>
				<Input
					value={phone}
					onChange={(e) => setPhone(e.target.value)}
					placeholder="Phone (optional)"
					className="rounded-none border-2 border-foreground"
				/>
				<div className="flex justify-end gap-2 pt-2">
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						className="rounded-none border-2 border-foreground font-bold uppercase shadow-[2px_2px_0_hsl(var(--foreground))]"
					>
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={isPending}
						className="rounded-none border-2 border-foreground font-bold uppercase shadow-[3px_3px_0_hsl(var(--foreground))]"
					>
						Create
					</Button>
				</div>
			</form>
		</ModalFrame>
	);
}
