CREATE TABLE "lab_results" (
  "id" TEXT NOT NULL,
  "test_date" DATE NOT NULL,
  "test_name" VARCHAR(128) NOT NULL,
  "test_key" VARCHAR(64),
  "value" DECIMAL(10,3) NOT NULL,
  "unit" VARCHAR(32) NOT NULL,
  "ref_range_low" DECIMAL(10,3),
  "ref_range_high" DECIMAL(10,3),
  "lab_name" VARCHAR(128),
  "panel_name" VARCHAR(128),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lab_results_test_date_idx" ON "lab_results"("test_date" DESC);
CREATE INDEX "lab_results_test_key_idx" ON "lab_results"("test_key");
