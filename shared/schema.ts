import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  emailVerified: boolean("email_verified").default(false),
  verificationToken: text("verification_token"),
  telegramBotToken: text("telegram_bot_token"),
  telegramChatId: text("telegram_chat_id"),
  stripeSecretKey: text("stripe_secret_key"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  password: true,
});

// Extended schema with validation for registration
export const userRegistrationSchema = insertUserSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters long"),
  email: z.string().email("Invalid email address"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

// Extended schema for Telegram bot settings
export const telegramBotSchema = z.object({
  telegramBotToken: z.string().min(20, "Invalid bot token"),
  telegramChatId: z.string().min(5, "Invalid chat ID"),
  stripeSecretKey: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type TelegramBotSettings = z.infer<typeof telegramBotSchema>;
export type User = typeof users.$inferSelect;
