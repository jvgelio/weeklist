CREATE INDEX IF NOT EXISTS "tasks_bucket_key_position_idx" ON "tasks" ("bucket_key","position");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_bucket_key_idx" ON "tasks" ("bucket_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subtasks_task_id_position_idx" ON "subtasks" ("task_id","position");
