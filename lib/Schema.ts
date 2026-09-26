import {
  pgTable,
  pgEnum,
  serial,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  customType,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────────────────
// pgvector custom type (works regardless of drizzle version —
// requires `CREATE EXTENSION IF NOT EXISTS vector;` on the DB)
// ─────────────────────────────────────────────────────────
const vector = (dimensions: number) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${dimensions})`;
    },
    toDriver(value: number[]) {
      return `[${value.join(",")}]`;
    },
    fromDriver(value: string) {
      return value
        .slice(1, -1)
        .split(",")
        .map(Number);
    },
  });

// ─────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────
export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "free",
  "premium",
  "elite",
]);

export const datingAppEnum = pgEnum("dating_app", [
  "tinder",
  "hinge",
  "bumble",
  "other",
]);

export const threadStatusEnum = pgEnum("thread_status", [
  "active",
  "archived",
  "gone_cold",
]);

export const messageSenderEnum = pgEnum("message_sender", [
  "user",
  "match",
  "coach_annotation",
  "coach_system",
]);

export const learningSessionTypeEnum = pgEnum("learning_session_type", [
  "persona_practice",
  "quiz",
  "qna",
]);

// ─────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  firebaseUid: varchar("firebase_uid", { length: 128 }).notNull(),
  email: varchar("email", { length: 255 }),
  avatarUrl: text("avatar_url"), // uploaded profile picture, nullable — Firebase Storage/R2 URL
  datingApps: datingAppEnum("dating_apps").array().notNull().default([]),
  subscriptionTier: subscriptionTierEnum("subscription_tier")
    .notNull()
    .default("free"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 128 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 128 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  firebaseUidIdx: uniqueIndex("users_firebase_uid_idx").on(t.firebaseUid),
}));

// ─────────────────────────────────────────────────────────
// Persona / onboarding — drives Screen 6 chips + system prompt tone
// ─────────────────────────────────────────────────────────
export const userPersonas = pgTable("user_personas", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  vibeTags: text("vibe_tags").array().notNull().default([]), // sport, culture, music, travel...
  communicationStyle: varchar("communication_style", { length: 64 }), // e.g. "direct_confident"
  focusArea: varchar("focus_area", { length: 64 }), // e.g. "keeping_conversations_moving"
  personaId: varchar("persona_id", { length: 32 }), // maps to the 11-persona system
  matchOrPractice: varchar("match_or_practice", { length: 16 }), // "match" | "practice"
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  userIdIdx: uniqueIndex("user_personas_user_id_idx").on(t.userId),
}));

// ─────────────────────────────────────────────────────────
// Credit metering — the entire free/premium lever
// ─────────────────────────────────────────────────────────
export const creditBalances = pgTable("credit_balances", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  analyzeCreditsRemaining: integer("analyze_credits_remaining").notNull().default(5),
  learningCreditsRemaining: integer("learning_credits_remaining").notNull().default(3),
  dailyResetAt: timestamp("daily_reset_at").notNull(),
  bonusCreditsFromStreaks: integer("bonus_credits_from_streaks").notNull().default(0),
  bonusCreditsFromReferrals: integer("bonus_credits_from_referrals").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  userIdIdx: uniqueIndex("credit_balances_user_id_idx").on(t.userId),
}));

// ─────────────────────────────────────────────────────────
// Threads (one per match/conversation)
// ─────────────────────────────────────────────────────────
export const threads = pgTable("threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  matchLabel: varchar("match_label", { length: 128 }).notNull(), // name/label she's saved under
  status: threadStatusEnum("status").notNull().default("active"),
  whoOpened: varchar("who_opened", { length: 8 }), // "her" | "him"
  lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  userIdIdx: index("threads_user_id_idx").on(t.userId),
  userStatusIdx: index("threads_user_status_idx").on(t.userId, t.status),
}));

// ─────────────────────────────────────────────────────────
// Messages — three-party structure, one table
// coach insight/annotation/next-step-prompt lives in `metadata`
// so rendering a thread is a single query, no joins
// ─────────────────────────────────────────────────────────
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  threadId: uuid("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  sender: messageSenderEnum("sender").notNull(),
  content: text("content").notNull(),
  // metadata shape (all optional depending on sender):
  // { insight?: string, nextStepPrompt?: string, encouragement?: string,
  //   draftFeedback?: string, isRetroactive?: boolean, creditsRemaining?: number }
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  threadIdIdx: index("messages_thread_id_idx").on(t.threadId, t.createdAt),
}));

// ─────────────────────────────────────────────────────────
// Learning section — persona practice / quiz / general Q&A
// ─────────────────────────────────────────────────────────
export const learningSessions = pgTable("learning_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: learningSessionTypeEnum("type").notNull(),
  content: jsonb("content").$type<Record<string, unknown>>(), // transcript / quiz Q&A / qna log
  creditsEarned: integer("credits_earned").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  userIdIdx: index("learning_sessions_user_id_idx").on(t.userId, t.createdAt),
}));

// ─────────────────────────────────────────────────────────
// Streaks (Learning-section daily activity)
// ─────────────────────────────────────────────────────────
export const streaks = pgTable("streaks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActivityDate: timestamp("last_activity_date"),
}, (t) => ({
  userIdIdx: uniqueIndex("streaks_user_id_idx").on(t.userId),
}));

// ─────────────────────────────────────────────────────────
// Referrals
// ─────────────────────────────────────────────────────────
export const referrals = pgTable("referrals", {
  id: uuid("id").defaultRandom().primaryKey(),
  referrerId: uuid("referrer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  referredId: uuid("referred_id").references(() => users.id, { onDelete: "set null" }),
  inviteCode: varchar("invite_code", { length: 32 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("pending"), // pending | signed_up | analyzed
  referrerBonusGranted: boolean("referrer_bonus_granted").notNull().default(false),
  referredBonusGranted: boolean("referred_bonus_granted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  inviteCodeIdx: uniqueIndex("referrals_invite_code_idx").on(t.inviteCode),
}));

// ─────────────────────────────────────────────────────────
// Profile — growth-view insights (free visible + locked teasers)
// ─────────────────────────────────────────────────────────
export const profileInsights = pgTable("profile_insights", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 64 }), // openers | escalation | consistency | pattern
  title: text("title").notNull(), // dynamically generated, never generic stock copy
  body: text("body"),
  isLocked: boolean("is_locked").notNull().default(true),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
}, (t) => ({
  userIdIdx: index("profile_insights_user_id_idx").on(t.userId),
}));

// ─────────────────────────────────────────────────────────
// RAG pipeline — scraped coach material, chunked + embedded
// ─────────────────────────────────────────────────────────
export const ragSources = pgTable("rag_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  coachName: varchar("coach_name", { length: 128 }).notNull(), // e.g. "Matthew Hussey"
  sourceType: varchar("source_type", { length: 16 }).notNull(), // "youtube" | "blog"
  sourceUrl: text("source_url").notNull(),
  rawText: text("raw_text"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ragChunks = pgTable("rag_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceId: uuid("source_id").notNull().references(() => ragSources.id, { onDelete: "cascade" }),
  coachName: varchar("coach_name", { length: 128 }).notNull(), // denormalized for fast filtering
  chunkText: text("chunk_text").notNull(),
  embedding: vector(768)("embedding"), // matches Gemini text-embedding-004
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ one, many }) => ({
  persona: one(userPersonas, {
    fields: [users.id],
    references: [userPersonas.userId],
  }),
  creditBalance: one(creditBalances, {
    fields: [users.id],
    references: [creditBalances.userId],
  }),
  streak: one(streaks, {
    fields: [users.id],
    references: [streaks.userId],
  }),
  threads: many(threads),
  learningSessions: many(learningSessions),
  profileInsights: many(profileInsights),
}));

export const threadsRelations = relations(threads, ({ one, many }) => ({
  user: one(users, { fields: [threads.userId], references: [users.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  thread: one(threads, { fields: [messages.threadId], references: [threads.id] }),
}));

export const ragSourcesRelations = relations(ragSources, ({ many }) => ({
  chunks: many(ragChunks),
}));

export const ragChunksRelations = relations(ragChunks, ({ one }) => ({
  source: one(ragSources, { fields: [ragChunks.sourceId], references: [ragSources.id] }),
}));