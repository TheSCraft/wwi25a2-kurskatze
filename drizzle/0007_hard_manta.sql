CREATE TABLE `goals_reached` (
	`goal` text PRIMARY KEY NOT NULL,
	`at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `cat` ADD `actions` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `detail` text;