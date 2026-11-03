import {integer,sqliteTable,text} from "drizzle-orm/sqlite-core";
export const players=sqliteTable("players",{id:text("id").primaryKey(),name:text("name").notNull(),points:integer("points").notNull(),last:integer("last").notNull()});
export const cat=sqliteTable("cat",{id:integer("id").primaryKey(),food:integer("food").notNull(),love:integer("love").notNull(),calls:integer("calls").notNull()});
