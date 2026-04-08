"use client";

import { ModalFrame } from "@/components/modals/ModalFrame";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Stop } from "@/lib/db/schema";

export function ImportStopsModal({
	data,
	onClose,
	onConfirm,
	isPending,
}: {
	data: Stop[];
	onClose: () => void;
	onConfirm: () => void;
	isPending: boolean;
}) {
	return (
		<ModalFrame title="Import stops preview" onClose={onClose}>
			<p className="text-xs text-muted-foreground">
				{data.length} stops found in file
			</p>
			<ScrollArea className="mt-2 max-h-72 rounded-none border-2 border-foreground">
				<table className="w-full text-xs">
					<thead>
						<tr className="border-b-2 border-foreground">
							<th className="p-2 text-left font-black uppercase tracking-widest">
								#
							</th>
							<th className="p-2 text-left font-black uppercase tracking-widest">
								ID
							</th>
							<th className="p-2 text-left font-black uppercase tracking-widest">
								Name
							</th>
							<th className="p-2 text-left font-black uppercase tracking-widest">
								Lat
							</th>
							<th className="p-2 text-left font-black uppercase tracking-widest">
								Lng
							</th>
						</tr>
					</thead>
					<tbody>
						{data.map((s, i) => (
							<tr key={`${s.id}-${i}`} className="border-b-2 border-foreground">
								<td className="p-1">{i + 1}</td>
								<td className="p-1">{s.id}</td>
								<td className="p-1">{s.name}</td>
								<td className="p-1">{s.lat}</td>
								<td className="p-1">{s.lng}</td>
							</tr>
						))}
					</tbody>
				</table>
			</ScrollArea>
			<p className="mt-2 text-xs text-muted-foreground">
				Existing stops with the same ID will be overwritten
			</p>
			<div className="mt-3 flex justify-end gap-2">
				<Button
					type="button"
					variant="outline"
					onClick={onClose}
					className="rounded-none border-2 border-foreground font-bold uppercase shadow-[2px_2px_0_hsl(var(--foreground))]"
				>
					Cancel
				</Button>
				<Button
					type="button"
					disabled={isPending}
					onClick={onConfirm}
					className="rounded-none border-2 border-foreground font-bold uppercase shadow-[3px_3px_0_hsl(var(--foreground))]"
				>
					Confirm import ({data.length} stops)
				</Button>
			</div>
		</ModalFrame>
	);
}
