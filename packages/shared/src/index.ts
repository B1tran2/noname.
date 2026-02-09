import { z } from "zod";

export const relayMessageSchema = z.object({
  type: z.enum(["photo", "result", "heartbeat"]),
  payload: z.record(z.any())
});

export type RelayMessage = z.infer<typeof relayMessageSchema>;

export const leaderboardEntrySchema = z.object({
  userId: z.string().uuid(),
  alias: z.string(),
  totalPoints: z.number(),
  weeklyPoints: z.number(),
  streak: z.number(),
  updatedAt: z.number()
});

export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;
