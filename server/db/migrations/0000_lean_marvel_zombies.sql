CREATE TABLE `chat_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role` text NOT NULL,
	`type` text DEFAULT 'text' NOT NULL,
	`content` text NOT NULL,
	`media_path` text,
	`buttons` text DEFAULT '[]',
	`analysis_id` integer,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `chat_session` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`step` text DEFAULT 'idle' NOT NULL,
	`pending_photo_path` text,
	`pending_photo_base64` text,
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `combos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`items` text DEFAULT '[]' NOT NULL,
	`is_default` integer DEFAULT false,
	`usage_count` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `daily_factors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer,
	`date` text NOT NULL,
	`heat_exposure` integer DEFAULT false,
	`sun_exposure` integer DEFAULT false,
	`spicy_food` integer DEFAULT false,
	`alcohol` integer DEFAULT false,
	`hot_drinks` integer DEFAULT false,
	`intensive_exercise` integer DEFAULT false,
	`stress` integer DEFAULT false,
	`flush` integer DEFAULT false,
	`new_product` integer DEFAULT false,
	`sleep_hours` real,
	`sleep_quality` integer,
	`exercise_type` text,
	`exercise_intensity` text,
	`exercise_duration_min` integer,
	`exercise_source` text,
	`cycle_day` integer,
	`cycle_phase` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`moment` text DEFAULT 'morning',
	`photo_path` text,
	`photo_source` text DEFAULT 'web',
	`voice_transcript` text,
	`notes` text,
	`source` text DEFAULT 'web',
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `evolution_proposals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trigger` text NOT NULL,
	`description` text NOT NULL,
	`proposed_changes` text NOT NULL,
	`status` text DEFAULT 'pending',
	`pr_url` text,
	`confirmed_at` text,
	`applied_at` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `inci_ingredients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer,
	`name` text NOT NULL,
	`inci` text NOT NULL,
	`risk_level` integer,
	`functions` text DEFAULT '[]',
	`concerns` text DEFAULT '[]',
	`comedogenic` integer,
	`irritant` integer DEFAULT false,
	`allergen` integer DEFAULT false,
	`zone_correlations` text DEFAULT '{}',
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `known_foods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`aliases` text DEFAULT '[]',
	`calories_per_100g` real,
	`protein_per_100g` real,
	`carbs_per_100g` real,
	`fat_per_100g` real,
	`fiber_per_100g` real,
	`category` text,
	`inflammatory_index` real,
	`is_dairy` integer DEFAULT false,
	`is_gluten` integer DEFAULT false,
	`is_omega3_source` integer DEFAULT false,
	`is_zinc_source` integer DEFAULT false,
	`times_logged` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `lesions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer,
	`date` text NOT NULL,
	`zone` text NOT NULL,
	`type` text,
	`size` text,
	`stage` text DEFAULT 'new',
	`picking` integer DEFAULT false,
	`infected` integer DEFAULT false,
	`treatments` text DEFAULT '[]',
	`resolved_at` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `nutrition_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer,
	`date` text NOT NULL,
	`description` text,
	`foods` text DEFAULT '[]',
	`protein_g` real,
	`carbs_g` real,
	`fat_g` real,
	`fiber_g` real,
	`calories` integer,
	`macros_source` text DEFAULT 'estimated_by_ai',
	`macros_confidence` real,
	`meal` text DEFAULT 'full_day',
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`category` text,
	`inci_raw` text,
	`notes` text,
	`is_active` integer DEFAULT true,
	`first_used_at` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `skin_analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer,
	`date` text NOT NULL,
	`acne_score` real,
	`hydration_score` real,
	`radiance_score` real,
	`texture_score` real,
	`firmness_score` real,
	`evenness_score` real,
	`fine_lines_score` real,
	`barrier_score` real,
	`rosacea_score` real,
	`glass_skin_score` real,
	`zones` text DEFAULT '{}',
	`lesions_active` text DEFAULT '{}',
	`vs_yesterday` text,
	`summary` text,
	`immediate_recos` text,
	`routine_for_tonight` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`age` integer,
	`weight_kg` real,
	`height_cm` real,
	`protein_goal_g` real,
	`carbs_goal_g` real,
	`fat_goal_g` real,
	`calories_goal` integer,
	`activity_level` text DEFAULT 'moderate',
	`skin_conditions` text DEFAULT '[]',
	`cycle_length` integer DEFAULT 28,
	`last_period_date` text,
	`last_apple_health_sync` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `whatsapp_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from` text NOT NULL,
	`step` integer DEFAULT 1 NOT NULL,
	`photo_path` text,
	`photo_media_id` text,
	`pending_questions` text DEFAULT '[]',
	`questions_asked` integer DEFAULT 0,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entries_date_unique` ON `entries` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `known_foods_name_unique` ON `known_foods` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `whatsapp_sessions_from_unique` ON `whatsapp_sessions` (`from`);