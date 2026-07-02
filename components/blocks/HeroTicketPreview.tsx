"use client";

import { useTheme } from "@/app/context/ThemeContext";
import { Bus, Clock, QrCode, ShieldCheck, Ticket } from "lucide-react";
import { useEffect, useState } from "react";

export default function HeroTicketPreview() {
	const { isDark } = useTheme();
	const [currentTime, setCurrentTime] = useState("");
	const [progress, setProgress] = useState(35);
	const [direction, setDirection] = useState(1);

	// Simulate route progress changing slightly to look "live"
	useEffect(() => {
		const interval = setInterval(() => {
			setProgress((p) => {
				let next = p + 0.5 * direction;
				if (next >= 85) {
					setDirection(-1);
					next = 85;
				} else if (next <= 15) {
					setDirection(1);
					next = 15;
				}
				return next;
			});
		}, 150);

		// Format time (HH:MM:SS)
		const updateTime = () => {
			const d = new Date();
			setCurrentTime(
				d.toLocaleTimeString("en-US", {
					hour12: false,
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
				}),
			);
		};
		updateTime();
		const timeInterval = setInterval(updateTime, 1000);

		return () => {
			clearInterval(interval);
			clearInterval(timeInterval);
		};
	}, [direction]);

	return (
		<div className="flex items-center justify-center p-2">
			{/* Neubrutalist Phone Mockup */}
			<div
				className="relative w-full max-w-[310px] overflow-hidden border-4 border-foreground bg-foreground p-3 transition-colors duration-300 neo-shadow"
				style={{
					borderRadius: "32px",
					boxShadow: "8px 8px 0px var(--color-navy)",
				}}
			>
				{/* Phone Notch/Speaker */}
				<div className="absolute top-0 left-1/2 z-20 h-5 w-28 -translate-x-1/2 flex items-center justify-center">
					<div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
				</div>

				{/* Internal Screen Area */}
				<div
					className="relative overflow-hidden border-2 border-foreground bg-[#f8f9fa] px-3 pt-6 pb-4 transition-colors duration-300 dark:bg-[#0a0a0d]"
					style={{
						borderRadius: "22px",
						borderColor: "var(--color-navy)",
					}}
				>
					{/* Status Bar */}
					<div className="mb-4 flex items-center justify-between text-[10px] font-bold tracking-wider text-[#0d1b2a] dark:text-[#f5f5f7]">
						<span>{currentTime || "12:00:00"}</span>
						<span className="flex items-center gap-1">
							<span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
							LIVE DATA
						</span>
					</div>

					{/* Ticket Header Label */}
					<div className="mb-3 flex items-center justify-between border-b-2 border-dashed border-foreground/20 pb-2">
						<div className="flex items-center gap-1.5">
							<Ticket className="h-4 w-4 text-emerald-500" />
							<span
								className="text-xs font-black uppercase tracking-wider text-[#0d1b2a] dark:text-[#f5f5f7]"
								style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
							>
								MOBILE TICKET
							</span>
						</div>
						<span
							className="rounded-none border-2 border-foreground bg-amber-400 px-1.5 py-0.5 text-[9px] font-black text-black tracking-wider"
							style={{ boxShadow: "1.5px 1.5px 0 var(--color-navy)" }}
						>
							ACTIVE
						</span>
					</div>

					{/* Physical Ticket Body */}
					<div
						className="relative border-2 border-foreground bg-white p-4 transition-colors duration-300 dark:bg-[#131318]"
						style={{
							borderColor: "var(--color-navy)",
							boxShadow: "3px 3px 0 var(--color-navy)",
						}}
					>
						{/* Semi-circular ticket cutouts (Neubrutalist notch styling) */}
						<div
							className="absolute -left-3 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-foreground bg-[#f8f9fa] transition-colors duration-300 dark:bg-[#0a0a0d]"
							style={{
								clipPath: "polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)",
								borderColor: "var(--color-navy)",
							}}
						/>
						<div
							className="absolute -right-3 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-foreground bg-[#f8f9fa] transition-colors duration-300 dark:bg-[#0a0a0d]"
							style={{
								clipPath: "polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)",
								borderColor: "var(--color-navy)",
							}}
						/>

						{/* Route Points */}
						<div className="grid grid-cols-5 items-center gap-1 border-b-2 border-dashed border-foreground/15 pb-3">
							<div className="col-span-2 text-left">
								<span className="text-[9px] font-bold text-muted-foreground uppercase block">
									Origin
								</span>
								<span
									className="text-base font-black text-[#0d1b2a] dark:text-[#f5f5f7] leading-tight block uppercase"
									style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
								>
									MANGALORE
								</span>
								<span className="text-[8px] text-muted-foreground block">
									Statebank
								</span>
							</div>

							<div className="col-span-1 flex flex-col items-center justify-center">
								<Bus className="h-4 w-4 text-[#0e7c86] dark:text-[#f4a522] animate-bounce" />
								<span className="text-[8px] font-bold text-emerald-500 tracking-tighter">
									EXP
								</span>
							</div>

							<div className="col-span-2 text-right">
								<span className="text-[9px] font-bold text-muted-foreground uppercase block">
									Dest
								</span>
								<span
									className="text-base font-black text-[#0d1b2a] dark:text-[#f5f5f7] leading-tight block uppercase"
									style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
								>
									UDUPI
								</span>
								<span className="text-[8px] text-muted-foreground block">
									Service Stand
								</span>
							</div>
						</div>

						{/* Live Progress Bar with Animation */}
						<div className="my-4">
							<div className="flex justify-between items-center text-[8px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
								<span>Live Progress</span>
								<span className="text-emerald-500 font-extrabold">
									In Transit
								</span>
							</div>
							<div className="relative h-3 w-full border-2 border-foreground bg-gray-150 rounded-none dark:bg-zinc-800">
								{/* Filled progress */}
								<div
									className="h-full bg-[#0e7c86] transition-all duration-150"
									style={{ width: `${progress}%` }}
								/>
								{/* Pulsing Bus on progress */}
								<div
									className="absolute top-1/2 h-5 w-5 -translate-y-1/2 flex items-center justify-center rounded-full border border-foreground bg-amber-400 text-[10px] shadow transition-all duration-150"
									style={{
										left: `calc(${progress}% - 10px)`,
									}}
								>
									🚌
								</div>
							</div>
							<div className="flex justify-between text-[7px] font-bold text-muted-foreground mt-1 uppercase">
								<span>Surathkal</span>
								<span>Mulki</span>
								<span>Padubidri</span>
							</div>
						</div>

						{/* QR Code and Scan Animation */}
						<div className="relative flex justify-center py-2 bg-gray-50 dark:bg-zinc-900 border border-foreground/10 rounded-none">
							<div className="relative h-24 w-24 border-2 border-foreground bg-white p-1">
								<QrCode
									className="h-full w-full text-black"
									strokeWidth={1.5}
								/>

								{/* Animated scanning laser line */}
								<div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-[laser-scan_2.5s_infinite_ease-in-out]" />
							</div>
						</div>

						{/* Ticket Info details */}
						<div className="mt-4 grid grid-cols-2 gap-2 text-left text-[9px] border-t border-foreground/10 pt-3">
							<div>
								<span className="text-muted-foreground block uppercase font-medium">
									Fare Price
								</span>
								<span className="font-extrabold text-[#0d1b2a] dark:text-[#f5f5f7] text-xs">
									₹65.00 Paid
								</span>
							</div>
							<div>
								<span className="text-muted-foreground block uppercase font-medium">
									Crowd Level
								</span>
								<span className="font-extrabold text-amber-500 text-xs uppercase flex items-center gap-0.5">
									<span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block animate-ping" />
									Medium
								</span>
							</div>
						</div>
					</div>

					{/* Safety Info Badge */}
					<div className="mt-4 flex items-center justify-center gap-1.5 rounded-none border border-dashed border-foreground/20 p-2 text-[10px] font-bold text-[#0e7c86] dark:text-amber-400">
						<ShieldCheck className="h-3.5 w-3.5" />
						<span>SECURE UPI TICKET VALIDATED</span>
					</div>
				</div>

				{/* Home Button Bar at phone bottom */}
				<div className="mt-2.5 flex justify-center">
					<div className="h-1 w-20 rounded-full bg-muted-foreground/45" />
				</div>
			</div>

			{/* CSS Keyframes for Scan Animation */}
			<style>{`
				@keyframes laser-scan {
					0%, 100% {
						top: 0%;
					}
					50% {
						top: 100%;
					}
				}
			`}</style>
		</div>
	);
}
