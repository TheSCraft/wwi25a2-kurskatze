CREATE TABLE `accounts` (
	`player` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_key_unique` ON `accounts` (`key`);--> statement-breakpoint
CREATE TABLE `cooldowns` (
	`id` text PRIMARY KEY NOT NULL,
	`player` text NOT NULL,
	`action` text NOT NULL,
	`until` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`player` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `cat` ADD `active` integer;