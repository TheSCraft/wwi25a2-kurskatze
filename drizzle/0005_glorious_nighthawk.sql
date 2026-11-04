CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`type` text NOT NULL,
	`player` text,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_key_unique` ON `events` (`key`);--> statement-breakpoint
CREATE INDEX `events_at_idx` ON `events` (`at`,`id`);