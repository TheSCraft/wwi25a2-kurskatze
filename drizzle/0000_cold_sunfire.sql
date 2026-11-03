CREATE TABLE `cat` (
	`id` integer PRIMARY KEY NOT NULL,
	`food` integer NOT NULL,
	`love` integer NOT NULL,
	`calls` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`points` integer NOT NULL,
	`last` integer NOT NULL
);
