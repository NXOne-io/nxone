CREATE TABLE `notification_prefs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`org_id` text NOT NULL,
	`weekly_digest` integer DEFAULT false NOT NULL,
	`overdue_alerts` integer DEFAULT false NOT NULL,
	`last_sent_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`org_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notify_user_org_idx` ON `notification_prefs` (`user_id`,`org_id`);