"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
	chests,
	earnedTitles,
	rewards,
	stickers,
	transactions,
	users,
	xpEvents,
} from "@/lib/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const STICKER_TITLE_POOL = {
	normal: [
		{ type: "sticker", value: "bus_rookie", rarity: "common", weight: 40 },
		{ type: "sticker", value: "early_bird", rarity: "common", weight: 30 },
		{ type: "sticker", value: "commuter_star", rarity: "rare", weight: 18 },
		{ type: "sticker", value: "night_rider", rarity: "rare", weight: 8 },
		{ type: "title", value: "Night Rider", rarity: "epic", weight: 3 },
		{ type: "title", value: "Dawn Rider", rarity: "epic", weight: 1 },
	],
	silver: [
		{ type: "sticker", value: "speed_star", rarity: "common", weight: 35 },
		{ type: "sticker", value: "route_master", rarity: "rare", weight: 30 },
		{ type: "sticker", value: "city_hopper", rarity: "rare", weight: 20 },
		{ type: "sticker", value: "golden_wheel", rarity: "epic", weight: 10 },
		{ type: "title", value: "City Hopper", rarity: "epic", weight: 4 },
		{ type: "title", value: "Road Warrior", rarity: "epic", weight: 1 },
	],
	gold: [
		{ type: "sticker", value: "golden_wheel", rarity: "rare", weight: 30 },
		{ type: "sticker", value: "legend_crest", rarity: "epic", weight: 25 },
		{ type: "sticker", value: "crown_badge", rarity: "epic", weight: 20 },
		{ type: "title", value: "Road Warrior", rarity: "epic", weight: 15 },
		{ type: "title", value: "City Voyager", rarity: "epic", weight: 8 },
		{ type: "title", value: "Golden Rider", rarity: "legendary", weight: 2 },
	],
	legendary: [
		{ type: "sticker", value: "legend_crown", rarity: "legendary", weight: 30 },
		{
			type: "sticker",
			value: "infinity_badge",
			rarity: "legendary",
			weight: 25,
		},
		{ type: "title", value: "Golden Rider", rarity: "legendary", weight: 20 },
		{ type: "title", value: "BusLink Legend", rarity: "legendary", weight: 15 },
		{ type: "title", value: "Road God", rarity: "legendary", weight: 7 },
		{ type: "title", value: "Eternal Rider", rarity: "legendary", weight: 3 },
	],
};

const CASHBACK_POOL = {
	normal: { min: 5, max: 20 },
	silver: { min: 15, max: 50 },
	gold: { min: 30, max: 100 },
	legendary: { min: 75, max: 250 },
};

function weightedPick<T extends { weight: number }>(arr: T[]): T {
	const total = arr.reduce((s, r) => s + r.weight, 0);
	let rand = Math.random() * total;
	for (const item of arr) {
		rand -= item.weight;
		if (rand <= 0) return item;
	}
	return arr[0];
}

export async function getMyRewardsAction() {
	const session = await auth();
	if (!session) return { success: false, error: "Unauthorised" };
	const userId = session.user.id;

	const [reward] = await db
		.select()
		.from(rewards)
		.where(eq(rewards.userId, userId));

	const userChests = await db
		.select()
		.from(chests)
		.where(eq(chests.userId, userId))
		.orderBy(desc(chests.createdAt));

	const userStickers = await db
		.select()
		.from(stickers)
		.where(eq(stickers.userId, userId))
		.orderBy(desc(stickers.earnedAt));

	const userTitles = await db
		.select()
		.from(earnedTitles)
		.where(eq(earnedTitles.userId, userId))
		.orderBy(desc(earnedTitles.earnedAt));

	const xpHistory = await db
		.select()
		.from(xpEvents)
		.where(eq(xpEvents.userId, userId))
		.orderBy(desc(xpEvents.createdAt))
		.limit(20);

	const profile = reward || {
		xpPoints: 0,
		xpLevel: "Newcomer",
		activeTitle: "New Rider",
		totalKm: "0.00",
		pendingCashbackInr: "0.00",
	};

	const currentXP = profile.xpPoints;
	const nextMilestone = (Math.floor(currentXP / 250) + 1) * 250;

	return {
		success: true,
		data: {
			profile,
			chests: {
				unopened: userChests.filter((c) => !c.isOpened),
				opened: userChests.filter((c) => c.isOpened),
				total: userChests.length,
			},
			stickers: userStickers,
			earned_titles: userTitles,
			xp_history: xpHistory,
			next_chest_at_xp: nextMilestone,
			xp_to_next_chest: nextMilestone - currentXP,
		},
	};
}

export async function openChestAction(chestId: number) {
	const session = await auth();
	if (!session) return { success: false, error: "Unauthorised" };
	const userId = session.user.id;

	try {
		const result = await db.transaction(async (tx) => {
			const [chest] = await tx
				.select()
				.from(chests)
				.where(and(eq(chests.id, chestId), eq(chests.userId, userId)))
				.for("update");

			if (!chest) {
				throw new Error("Chest not found");
			}

			if (chest.isOpened) {
				throw new Error("Chest already opened");
			}

			let rewardType: string;
			let rewardValue: string;
			let rarity: string;
			let message: string;

			// 1 in 50 chance of cashback
			const isCashback = Math.floor(Math.random() * 50) + 1 === 1;

			if (isCashback) {
				const typeKey =
					(chest.chestType as keyof typeof CASHBACK_POOL) || "normal";
				const cp = CASHBACK_POOL[typeKey];
				const amount =
					Math.floor(Math.random() * (cp.max - cp.min + 1)) + cp.min;
				rewardType = "cashback";
				rewardValue = String(amount);
				rarity = "rare";
				message = `₹${amount} added to your wallet!`;

				// Update user's wallet
				const [user] = await tx
					.select()
					.from(users)
					.where(eq(users.id, userId));

				const currentBalance = Number(user.walletBalance || 0);
				await tx
					.update(users)
					.set({
						walletBalance: (currentBalance + amount).toFixed(2),
					})
					.where(eq(users.id, userId));

				await tx.insert(transactions).values({
					userId,
					amountInr: amount.toFixed(2),
					type: "cashback",
					status: "confirmed",
				});
			} else {
				const typeKey =
					(chest.chestType as keyof typeof STICKER_TITLE_POOL) || "normal";
				const itemPool = STICKER_TITLE_POOL[typeKey];
				const item = weightedPick(itemPool);
				rewardType = item.type;
				rewardValue = item.value;
				rarity = item.rarity;

				if (item.type === "sticker") {
					await tx.insert(stickers).values({
						userId,
						stickerKey: item.value,
						rarity: item.rarity,
					});
					message = `You got the "${item.value}" sticker! (${item.rarity})`;
				} else {
					await tx
						.insert(earnedTitles)
						.values({
							userId,
							title: item.value,
							rarity: item.rarity,
						})
						.onConflictDoNothing();
					message = `You earned the title "${item.value}"! (${item.rarity})`;
				}
			}

			await tx
				.update(chests)
				.set({
					isOpened: true,
					openedAt: new Date(),
					rewardType,
					rewardValue,
					rarity,
				})
				.where(eq(chests.id, chestId));

			return {
				message,
				chestType: chest.chestType,
				reward: { type: rewardType, value: rewardValue, rarity },
				isCashback,
			};
		});

		revalidatePath("/dashboard");
		return { success: true, message: result.message, data: result };
	} catch (err: any) {
		return { success: false, error: err.message || "Failed to open chest" };
	}
}

export async function setTitleAction(title: string) {
	const session = await auth();
	if (!session) return { success: false, error: "Unauthorised" };
	const userId = session.user.id;

	if (!title?.trim()) {
		return { success: false, error: "Title is required" };
	}

	const trimmedTitle = title.trim();

	const hasTitle = await db
		.select()
		.from(earnedTitles)
		.where(
			and(
				eq(earnedTitles.userId, userId),
				eq(earnedTitles.title, trimmedTitle),
			),
		);

	if (!hasTitle.length) {
		return { success: false, error: "You have not earned this title" };
	}

	await db
		.update(rewards)
		.set({ activeTitle: trimmedTitle, updatedAt: new Date() })
		.where(eq(rewards.userId, userId));

	revalidatePath("/dashboard");
	return { success: true, message: "Title updated successfully" };
}

export async function getLeaderboardAction() {
	const result = await db
		.select({
			name: users.name,
			xpPoints: rewards.xpPoints,
			xpLevel: rewards.xpLevel,
			activeTitle: rewards.activeTitle,
			totalKm: rewards.totalKm,
		})
		.from(rewards)
		.innerJoin(users, eq(rewards.userId, users.id))
		.where(and(eq(users.role, "passenger"), eq(users.isActive, true)))
		.orderBy(desc(rewards.xpPoints))
		.limit(20);

	// Fetch sticker count for each user in parallel or sequentially
	const leaderboard = await Promise.all(
		result.map(async (row) => {
			// Find user's id
			const [user] = await db
				.select({ id: users.id })
				.from(users)
				.where(eq(users.name, row.name || ""));

			let stickerCount = 0;
			if (user) {
				const [countRes] = await db
					.select({ count: sql<number>`count(*)` })
					.from(stickers)
					.where(eq(stickers.userId, user.id));
				stickerCount = Number(countRes?.count || 0);
			}

			return {
				...row,
				sticker_count: stickerCount,
			};
		}),
	);

	return { success: true, data: leaderboard };
}
