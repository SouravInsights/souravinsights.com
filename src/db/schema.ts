import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  bigint,
} from "drizzle-orm/pg-core";

export const curatedLinks = pgTable("curated_links", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  notes: text("notes"),
  creatorTwitter: varchar("creator_twitter", { length: 100 }),
  clickCount: integer("click_count").default(0),
  newsletterStatus: varchar("newsletter_status", { length: 20 }).default(
    "none"
  ),
  buttondownEmailId: varchar("buttondown_email_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const favoriteLinks = pgTable("favorite_links", {
  id: bigint("id", { mode: "bigint" }).primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
