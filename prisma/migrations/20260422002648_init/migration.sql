-- CreateEnum
CREATE TYPE "EntryPeriod" AS ENUM ('morning', 'evening');

-- CreateEnum
CREATE TYPE "MedicationType" AS ENUM ('medication', 'hrt', 'supplement', 'other');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('stressor', 'nutrition', 'exercise', 'travel', 'illness', 'other');

-- CreateEnum
CREATE TYPE "SpottingColor" AS ENUM ('pale_pink', 'red', 'brown');

-- CreateTable
CREATE TABLE "log_entries" (
    "id" TEXT NOT NULL,
    "entry_date" DATE NOT NULL,
    "entry_period" "EntryPeriod" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "weight_lbs" DECIMAL(5,1),

    CONSTRAINT "log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptom_scores" (
    "id" TEXT NOT NULL,
    "log_entry_id" TEXT NOT NULL,
    "symptom_key" VARCHAR(64) NOT NULL,
    "score" SMALLINT NOT NULL,

    CONSTRAINT "symptom_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "side_effect_scores" (
    "id" TEXT NOT NULL,
    "log_entry_id" TEXT NOT NULL,
    "side_effect_key" VARCHAR(64) NOT NULL,
    "score" SMALLINT NOT NULL,

    CONSTRAINT "side_effect_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "period_logs" (
    "id" TEXT NOT NULL,
    "log_entry_id" TEXT NOT NULL,
    "is_present" BOOLEAN NOT NULL DEFAULT false,
    "flow_severity" SMALLINT,
    "spotting" BOOLEAN NOT NULL DEFAULT false,
    "spotting_color" "SpottingColor",

    CONSTRAINT "period_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometrics" (
    "id" TEXT NOT NULL,
    "log_entry_id" TEXT NOT NULL,
    "metric_key" VARCHAR(64) NOT NULL,
    "metric_value" DECIMAL(8,2),
    "metric_unit" VARCHAR(32),

    CONSTRAINT "biometrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(256) NOT NULL,
    "type" "MedicationType" NOT NULL,
    "dose" VARCHAR(128),
    "frequency" VARCHAR(128),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_periods" (
    "id" TEXT NOT NULL,
    "medication_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "dose_at_start" VARCHAR(128),
    "change_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medication_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "life_events" (
    "id" TEXT NOT NULL,
    "event_date" DATE NOT NULL,
    "category" "EventCategory" NOT NULL,
    "title" VARCHAR(256) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "life_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptom_definitions" (
    "key" VARCHAR(64) NOT NULL,
    "label" VARCHAR(128) NOT NULL,
    "category" VARCHAR(64),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER,

    CONSTRAINT "symptom_definitions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "side_effect_definitions" (
    "key" VARCHAR(64) NOT NULL,
    "label" VARCHAR(128) NOT NULL,
    "category" VARCHAR(64),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER,

    CONSTRAINT "side_effect_definitions_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "log_entries_entry_date_entry_period_key" ON "log_entries"("entry_date", "entry_period");

-- CreateIndex
CREATE UNIQUE INDEX "period_logs_log_entry_id_key" ON "period_logs"("log_entry_id");

-- AddForeignKey
ALTER TABLE "symptom_scores" ADD CONSTRAINT "symptom_scores_log_entry_id_fkey" FOREIGN KEY ("log_entry_id") REFERENCES "log_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "side_effect_scores" ADD CONSTRAINT "side_effect_scores_log_entry_id_fkey" FOREIGN KEY ("log_entry_id") REFERENCES "log_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_logs" ADD CONSTRAINT "period_logs_log_entry_id_fkey" FOREIGN KEY ("log_entry_id") REFERENCES "log_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometrics" ADD CONSTRAINT "biometrics_log_entry_id_fkey" FOREIGN KEY ("log_entry_id") REFERENCES "log_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_periods" ADD CONSTRAINT "medication_periods_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
