import { z } from "zod";
import { MEMBER_ROLES } from "./organizations";

export const memberInviteSchema = z.object({
  email: z.email().transform((e) => e.toLowerCase()),
  role: z.enum(MEMBER_ROLES).exclude(["owner"]),
});

export const connectionInviteSchema = z.object({
  email: z.email().transform((e) => e.toLowerCase()),
  message: z.string().trim().max(500).optional(),
});

export const INVITE_TTL_DAYS = 14;
