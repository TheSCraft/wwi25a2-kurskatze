import {integer,sqliteTable,text} from "drizzle-orm/sqlite-core";
export const players=sqliteTable("players",{id:text("id").primaryKey(),name:text("name").notNull(),points:integer("points").notNull(),last:integer("last").notNull()});
export const cat=sqliteTable("cat",{id:integer("id").primaryKey(),food:integer("food").notNull(),love:integer("love").notNull(),calls:integer("calls").notNull(),active:integer("active"),foodExpires:integer("food_expires")});
export const accounts=sqliteTable("accounts",{player:text("player").primaryKey(),key:text("key").unique().notNull(),password:text("password")});
export const sessions=sqliteTable("sessions",{token:text("token").primaryKey(),player:text("player").notNull(),expires:integer("expires").notNull()});
export const cooldowns=sqliteTable("cooldowns",{id:text("id").primaryKey(),player:text("player").notNull(),action:text("action").notNull(),until:integer("until").notNull()});

export const loginAttempts=sqliteTable("login_attempts",{key:text("key").primaryKey(),tries:integer("tries").notNull(),reset:integer("reset").notNull()});
