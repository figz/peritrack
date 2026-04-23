CREATE TABLE "prn_med_logs" (
  "id" TEXT NOT NULL,
  "log_entry_id" TEXT NOT NULL,
  "med_name" VARCHAR(128) NOT NULL,
  "taken" BOOLEAN NOT NULL DEFAULT false,
  "dose" VARCHAR(128),
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "prn_med_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "prn_med_logs" ADD CONSTRAINT "prn_med_logs_log_entry_id_fkey"
  FOREIGN KEY ("log_entry_id") REFERENCES "log_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
