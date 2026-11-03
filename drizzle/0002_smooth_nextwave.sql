CREATE TABLE `login_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`tries` integer NOT NULL,
	`reset` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD `password` text;