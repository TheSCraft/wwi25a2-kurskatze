CREATE TABLE `actions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player` text NOT NULL,
	`action` text NOT NULL,
	`points` integer NOT NULL,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `actions_at_idx` ON `actions` (`at`);--> statement-breakpoint
CREATE INDEX `actions_player_at_idx` ON `actions` (`player`,`at`);