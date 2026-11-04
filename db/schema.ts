import {index,integer,sqliteTable,text} from "drizzle-orm/sqlite-core";
export const players=sqliteTable("players",{id:text("id").primaryKey(),name:text("name").notNull(),points:integer("points").notNull(),last:integer("last").notNull()});
export const cat=sqliteTable("cat",{id:integer("id").primaryKey(),food:integer("food").notNull(),love:integer("love").notNull(),calls:integer("calls").notNull(),actions:integer("actions").notNull().default(0),active:integer("active"),foodExpires:integer("food_expires")});
export const accounts=sqliteTable("accounts",{player:text("player").primaryKey(),key:text("key").unique().notNull(),password:text("password"),joined:integer("joined"),fedRound:integer("fed_round")});
export const sessions=sqliteTable("sessions",{token:text("token").primaryKey(),player:text("player").notNull(),expires:integer("expires").notNull()});
export const cooldowns=sqliteTable("cooldowns",{id:text("id").primaryKey(),player:text("player").notNull(),action:text("action").notNull(),until:integer("until").notNull()});

export const loginAttempts=sqliteTable("login_attempts",{key:text("key").primaryKey(),tries:integer("tries").notNull(),reset:integer("reset").notNull()});

export const events=sqliteTable("events",{id:integer("id").primaryKey({autoIncrement:true}),key:text("key").notNull().unique(),type:text("type").notNull(),player:text("player"),at:integer("at").notNull(),detail:text("detail")},(t)=>[index("events_at_idx").on(t.at,t.id)]);

export const actions=sqliteTable("actions",{id:integer("id").primaryKey({autoIncrement:true}),player:text("player").notNull(),action:text("action").notNull(),points:integer("points").notNull(),at:integer("at").notNull()},(t)=>[index("actions_at_idx").on(t.at),index("actions_player_at_idx").on(t.player,t.at)]);

export const goalsReached=sqliteTable("goals_reached",{goal:text("goal").primaryKey(),at:integer("at").notNull()});
