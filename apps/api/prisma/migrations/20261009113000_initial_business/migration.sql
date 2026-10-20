-- Initial empty-database migration. See MIGRATIONS.md for recovery policy.
BEGIN;
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "orai";
SET LOCAL search_path = "orai", "pg_catalog";

-- CreateEnum
CREATE TYPE "DataScope" AS ENUM ('DEMO', 'LIVE');

-- CreateEnum
CREATE TYPE "DatabaseEnvironment" AS ENUM ('DEVELOPMENT', 'TEST', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'REVIEWED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExperienceType" AS ENUM ('SCORE', 'TENDENCY');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('DOUYIN', 'XIAOHONGSHU', 'MANUAL');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'FULFILLED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CodeStatus" AS ENUM ('ISSUED', 'CLAIMED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "Ownership" AS ENUM ('ANONYMOUS', 'ACCOUNT_BOUND');

-- CreateEnum
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('STARTED', 'SUBMITTED', 'COMPLETED', 'INVALID');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('COVER', 'VIDEO', 'SCRIPT', 'COPY');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('DRAFT', 'REVIEWED', 'READY', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EventKind" AS ENUM ('VIEW', 'REDEMPTION', 'START', 'COMPLETE', 'REPORT_VIEW', 'SHARE_EXPORT', 'REFUND');

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('WEB', 'MANUAL', 'DEMO');

-- CreateTable
CREATE TABLE "environment_marker" (
    "id" INTEGER NOT NULL,
    "environment" "DatabaseEnvironment" NOT NULL,
    "database_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "environment_marker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "price_fen" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "duration_minutes" INTEGER NOT NULL,
    "duration_is_estimate" BOOLEAN NOT NULL DEFAULT true,
    "experience_type" "ExperienceType" NOT NULL,
    "theme_key" TEXT NOT NULL,
    "cover_url" TEXT,
    "public_sample" JSONB NOT NULL,
    "purchase_url" TEXT,
    "purchase_notice" TEXT NOT NULL,
    "redemption_notice" TEXT NOT NULL,
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "recommendation_order" INTEGER NOT NULL DEFAULT 0,
    "current_version_id" UUID,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_tags" (
    "product_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "product_tags_pkey" PRIMARY KEY ("product_id","tag_id")
);

-- CreateTable
CREATE TABLE "product_versions" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "configuration" JSONB NOT NULL,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "reference" TEXT NOT NULL,
    "product_version_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amount_fen" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refunded_at" TIMESTAMPTZ(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_batches" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "code_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemption_codes" (
    "id" UUID NOT NULL,
    "digest" TEXT NOT NULL,
    "scope" "DataScope" NOT NULL,
    "status" "CodeStatus" NOT NULL DEFAULT 'ISSUED',
    "order_id" UUID NOT NULL,
    "product_version_id" UUID NOT NULL,
    "batch_id" UUID,
    "entitlement_id" UUID,
    "replaces_code_id" UUID,
    "claim_deadline" TIMESTAMPTZ(3) NOT NULL,
    "claimed_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redemption_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "supabase_user_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "disabled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlements" (
    "id" UUID NOT NULL,
    "product_version_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "order_id" UUID NOT NULL,
    "ownership" "Ownership" NOT NULL DEFAULT 'ANONYMOUS',
    "owner_user_id" UUID,
    "status" "EntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "reports_allowed" INTEGER NOT NULL DEFAULT 1,
    "reports_consumed" INTEGER NOT NULL DEFAULT 0,
    "claimed_at" TIMESTAMPTZ(3) NOT NULL,
    "access_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "bound_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_sessions" (
    "id" UUID NOT NULL,
    "token_digest" TEXT NOT NULL,
    "scope" "DataScope" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "access_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_grants" (
    "session_id" UUID NOT NULL,
    "entitlement_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "access_grants_pkey" PRIMARY KEY ("session_id","entitlement_id")
);

-- CreateTable
CREATE TABLE "entitlement_bindings" (
    "entitlement_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entitlement_bindings_pkey" PRIMARY KEY ("entitlement_id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" UUID NOT NULL,
    "entitlement_id" UUID NOT NULL,
    "product_version_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "ordinal" INTEGER NOT NULL DEFAULT 1,
    "status" "AttemptStatus" NOT NULL DEFAULT 'STARTED',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "stats_valid" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "invalidated_at" TIMESTAMPTZ(3),
    "answers_expire_at" TIMESTAMPTZ(3),

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_answers" (
    "attempt_id" UUID NOT NULL,
    "question_id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "saved_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attempt_answers_pkey" PRIMARY KEY ("attempt_id","question_id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "product_version_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "result_type_id" TEXT NOT NULL,
    "snapshot" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_stats" (
    "product_version_id" UUID NOT NULL,
    "question_id" TEXT NOT NULL,
    "scope" "DataScope" NOT NULL,
    "answer_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_stats_pkey" PRIMARY KEY ("product_version_id","question_id")
);

-- CreateTable
CREATE TABLE "question_option_stats" (
    "product_version_id" UUID NOT NULL,
    "question_id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "question_option_stats_pkey" PRIMARY KEY ("product_version_id","question_id","option_id")
);

-- CreateTable
CREATE TABLE "result_stats" (
    "product_version_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "completed_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "result_stats_pkey" PRIMARY KEY ("product_version_id")
);

-- CreateTable
CREATE TABLE "result_type_stats" (
    "product_version_id" UUID NOT NULL,
    "result_type_id" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "result_type_stats_pkey" PRIMARY KEY ("product_version_id","result_type_id")
);

-- CreateTable
CREATE TABLE "campaign_assets" (
    "id" UUID NOT NULL,
    "product_version_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "platform" "Platform" NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "variant" TEXT NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'DRAFT',
    "text" TEXT,
    "storage_key" TEXT,
    "mime_type" TEXT,
    "byte_size" INTEGER,
    "checksum" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "campaign_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "product_version_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "platform" "Platform" NOT NULL,
    "title" TEXT NOT NULL,
    "purchase_url" TEXT,
    "content_url" TEXT,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "scope" "DataScope" NOT NULL,
    "kind" "EventKind" NOT NULL,
    "source" "EventSource" NOT NULL,
    "product_version_id" UUID,
    "campaign_id" UUID,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotent_requests" (
    "id" UUID NOT NULL,
    "actor_key" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "request_id" UUID NOT NULL,
    "request_digest" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "idempotent_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "scope" "DataScope" NOT NULL,
    "action" TEXT NOT NULL,
    "entity_kind" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "request_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_current_version_id_key" ON "products"("current_version_id");

-- CreateIndex
CREATE INDEX "products_scope_status_category_id_published_at_idx" ON "products"("scope", "status", "category_id", "published_at");

-- CreateIndex
CREATE INDEX "products_scope_status_recommended_recommendation_order_idx" ON "products"("scope", "status", "recommended", "recommendation_order");

-- CreateIndex
CREATE UNIQUE INDEX "products_id_scope_key" ON "products"("id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "products_current_version_id_id_scope_key" ON "products"("current_version_id", "id", "scope");

-- CreateIndex
CREATE INDEX "product_tags_tag_id_product_id_idx" ON "product_tags"("tag_id", "product_id");

-- CreateIndex
CREATE INDEX "product_versions_product_id_scope_status_idx" ON "product_versions"("product_id", "scope", "status");

-- CreateIndex
CREATE UNIQUE INDEX "product_versions_product_id_number_key" ON "product_versions"("product_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "product_versions_id_scope_key" ON "product_versions"("id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "product_versions_id_product_id_scope_key" ON "product_versions"("id", "product_id", "scope");

-- CreateIndex
CREATE INDEX "orders_scope_status_created_at_idx" ON "orders"("scope", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_platform_reference_key" ON "orders"("platform", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "orders_id_product_version_id_scope_key" ON "orders"("id", "product_version_id", "scope");

-- CreateIndex
CREATE INDEX "code_batches_order_id_idx" ON "code_batches"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "code_batches_id_order_id_scope_key" ON "code_batches"("id", "order_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "redemption_codes_digest_key" ON "redemption_codes"("digest");

-- CreateIndex
CREATE UNIQUE INDEX "redemption_codes_replaces_code_id_key" ON "redemption_codes"("replaces_code_id");

-- CreateIndex
CREATE INDEX "redemption_codes_order_id_idx" ON "redemption_codes"("order_id");

-- CreateIndex
CREATE INDEX "redemption_codes_batch_id_idx" ON "redemption_codes"("batch_id");

-- CreateIndex
CREATE INDEX "redemption_codes_entitlement_id_idx" ON "redemption_codes"("entitlement_id");

-- CreateIndex
CREATE INDEX "redemption_codes_product_version_id_scope_idx" ON "redemption_codes"("product_version_id", "scope");

-- CreateIndex
CREATE INDEX "redemption_codes_scope_status_claim_deadline_idx" ON "redemption_codes"("scope", "status", "claim_deadline");

-- CreateIndex
CREATE UNIQUE INDEX "users_supabase_user_id_key" ON "users"("supabase_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_id_scope_key" ON "users"("id", "scope");

-- CreateIndex
CREATE INDEX "entitlements_order_id_idx" ON "entitlements"("order_id");

-- CreateIndex
CREATE INDEX "entitlements_product_version_id_scope_idx" ON "entitlements"("product_version_id", "scope");

-- CreateIndex
CREATE INDEX "entitlements_owner_user_id_scope_status_claimed_at_idx" ON "entitlements"("owner_user_id", "scope", "status", "claimed_at");

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_id_scope_key" ON "entitlements"("id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_id_product_version_id_scope_key" ON "entitlements"("id", "product_version_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_id_owner_user_id_key" ON "entitlements"("id", "owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "access_sessions_token_digest_key" ON "access_sessions"("token_digest");

-- CreateIndex
CREATE INDEX "access_sessions_expires_at_idx" ON "access_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "access_sessions_id_scope_key" ON "access_sessions"("id", "scope");

-- CreateIndex
CREATE INDEX "access_grants_entitlement_id_idx" ON "access_grants"("entitlement_id");

-- CreateIndex
CREATE INDEX "entitlement_bindings_user_id_created_at_idx" ON "entitlement_bindings"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "entitlement_bindings_entitlement_id_user_id_key" ON "entitlement_bindings"("entitlement_id", "user_id");

-- CreateIndex
CREATE INDEX "attempts_product_version_id_scope_status_stats_valid_idx" ON "attempts"("product_version_id", "scope", "status", "stats_valid");

-- CreateIndex
CREATE INDEX "attempts_answers_expire_at_status_idx" ON "attempts"("answers_expire_at", "status");

-- CreateIndex
CREATE UNIQUE INDEX "attempts_entitlement_id_ordinal_key" ON "attempts"("entitlement_id", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "attempts_id_product_version_id_scope_key" ON "attempts"("id", "product_version_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "reports_attempt_id_key" ON "reports"("attempt_id");

-- CreateIndex
CREATE INDEX "reports_product_version_id_scope_idx" ON "reports"("product_version_id", "scope");

-- CreateIndex
CREATE INDEX "reports_expires_at_idx" ON "reports"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "reports_attempt_id_product_version_id_scope_key" ON "reports"("attempt_id", "product_version_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "result_stats_product_version_id_scope_key" ON "result_stats"("product_version_id", "scope");

-- CreateIndex
CREATE INDEX "campaign_assets_scope_platform_kind_status_idx" ON "campaign_assets"("scope", "platform", "kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_assets_product_version_id_platform_kind_variant_key" ON "campaign_assets"("product_version_id", "platform", "kind", "variant");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_code_key" ON "campaigns"("code");

-- CreateIndex
CREATE INDEX "campaigns_product_version_id_scope_idx" ON "campaigns"("product_version_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_id_product_version_id_scope_key" ON "campaigns"("id", "product_version_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "events_dedupe_key_key" ON "events"("dedupe_key");

-- CreateIndex
CREATE INDEX "events_scope_kind_occurred_at_idx" ON "events"("scope", "kind", "occurred_at");

-- CreateIndex
CREATE INDEX "events_product_version_id_scope_idx" ON "events"("product_version_id", "scope");

-- CreateIndex
CREATE INDEX "events_campaign_id_idx" ON "events"("campaign_id");

-- CreateIndex
CREATE INDEX "idempotent_requests_expires_at_idx" ON "idempotent_requests"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotent_requests_actor_key_operation_request_id_key" ON "idempotent_requests"("actor_key", "operation", "request_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_entity_kind_entity_id_created_at_idx" ON "admin_audit_logs"("entity_kind", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_actor_user_id_created_at_idx" ON "admin_audit_logs"("actor_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_current_version_id_id_scope_fkey" FOREIGN KEY ("current_version_id", "id", "scope") REFERENCES "product_versions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_versions" ADD CONSTRAINT "product_versions_product_id_scope_fkey" FOREIGN KEY ("product_id", "scope") REFERENCES "products"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_version_id_scope_fkey" FOREIGN KEY ("product_version_id", "scope") REFERENCES "product_versions"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_batches" ADD CONSTRAINT "code_batches_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_codes" ADD CONSTRAINT "redemption_codes_order_id_product_version_id_scope_fkey" FOREIGN KEY ("order_id", "product_version_id", "scope") REFERENCES "orders"("id", "product_version_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_codes" ADD CONSTRAINT "redemption_codes_product_version_id_scope_fkey" FOREIGN KEY ("product_version_id", "scope") REFERENCES "product_versions"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_codes" ADD CONSTRAINT "redemption_codes_batch_id_order_id_scope_fkey" FOREIGN KEY ("batch_id", "order_id", "scope") REFERENCES "code_batches"("id", "order_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_codes" ADD CONSTRAINT "redemption_codes_entitlement_id_product_version_id_scope_fkey" FOREIGN KEY ("entitlement_id", "product_version_id", "scope") REFERENCES "entitlements"("id", "product_version_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_codes" ADD CONSTRAINT "redemption_codes_replaces_code_id_fkey" FOREIGN KEY ("replaces_code_id") REFERENCES "redemption_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_product_version_id_scope_fkey" FOREIGN KEY ("product_version_id", "scope") REFERENCES "product_versions"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_order_id_product_version_id_scope_fkey" FOREIGN KEY ("order_id", "product_version_id", "scope") REFERENCES "orders"("id", "product_version_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_owner_user_id_scope_fkey" FOREIGN KEY ("owner_user_id", "scope") REFERENCES "users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_session_id_scope_fkey" FOREIGN KEY ("session_id", "scope") REFERENCES "access_sessions"("id", "scope") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_entitlement_id_scope_fkey" FOREIGN KEY ("entitlement_id", "scope") REFERENCES "entitlements"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_bindings" ADD CONSTRAINT "entitlement_bindings_entitlement_id_user_id_fkey" FOREIGN KEY ("entitlement_id", "user_id") REFERENCES "entitlements"("id", "owner_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_bindings" ADD CONSTRAINT "entitlement_bindings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_entitlement_id_product_version_id_scope_fkey" FOREIGN KEY ("entitlement_id", "product_version_id", "scope") REFERENCES "entitlements"("id", "product_version_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_product_version_id_scope_fkey" FOREIGN KEY ("product_version_id", "scope") REFERENCES "product_versions"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_attempt_id_product_version_id_scope_fkey" FOREIGN KEY ("attempt_id", "product_version_id", "scope") REFERENCES "attempts"("id", "product_version_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_product_version_id_scope_fkey" FOREIGN KEY ("product_version_id", "scope") REFERENCES "product_versions"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_stats" ADD CONSTRAINT "question_stats_product_version_id_scope_fkey" FOREIGN KEY ("product_version_id", "scope") REFERENCES "product_versions"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_option_stats" ADD CONSTRAINT "question_option_stats_product_version_id_question_id_fkey" FOREIGN KEY ("product_version_id", "question_id") REFERENCES "question_stats"("product_version_id", "question_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_stats" ADD CONSTRAINT "result_stats_product_version_id_scope_fkey" FOREIGN KEY ("product_version_id", "scope") REFERENCES "product_versions"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_type_stats" ADD CONSTRAINT "result_type_stats_product_version_id_fkey" FOREIGN KEY ("product_version_id") REFERENCES "result_stats"("product_version_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_assets" ADD CONSTRAINT "campaign_assets_product_version_id_scope_fkey" FOREIGN KEY ("product_version_id", "scope") REFERENCES "product_versions"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_product_version_id_scope_fkey" FOREIGN KEY ("product_version_id", "scope") REFERENCES "product_versions"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_product_version_id_scope_fkey" FOREIGN KEY ("product_version_id", "scope") REFERENCES "product_versions"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_campaign_id_product_version_id_scope_fkey" FOREIGN KEY ("campaign_id", "product_version_id", "scope") REFERENCES "campaigns"("id", "product_version_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_user_id_scope_fkey" FOREIGN KEY ("actor_user_id", "scope") REFERENCES "users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Constraints Prisma cannot express in its data model.
ALTER TABLE "environment_marker" ADD CONSTRAINT "environment_marker_singleton" CHECK (id = 1);
ALTER TABLE "categories" ADD CONSTRAINT "categories_order_nonnegative" CHECK (sort_order >= 0);
ALTER TABLE "products" ADD CONSTRAINT "products_valid_display" CHECK (
  price_fen >= 0 AND price_fen <= 10000000 AND currency = 'CNY' AND
  duration_minutes BETWEEN 1 AND 120 AND recommendation_order >= 0 AND
  (status <> 'PUBLISHED' OR (current_version_id IS NOT NULL AND published_at IS NOT NULL)));
ALTER TABLE "product_versions" ADD CONSTRAINT "versions_valid_shape" CHECK (
  number > 0 AND jsonb_typeof(configuration) = 'object' AND
  configuration->>'engine' = 'dimensions_v1' AND configuration->>'schemaVersion' = '1' AND
  (status <> 'PUBLISHED' OR published_at IS NOT NULL));
ALTER TABLE "orders" ADD CONSTRAINT "orders_valid_amount" CHECK (
  quantity BETWEEN 1 AND 1000 AND amount_fen BETWEEN 0 AND 10000000 AND
  (status <> 'REFUNDED' OR refunded_at IS NOT NULL));
ALTER TABLE "redemption_codes" ADD CONSTRAINT "codes_digest_and_claim" CHECK (
  digest ~ '^[0-9a-f]{64}$' AND
  (status <> 'CLAIMED' OR (entitlement_id IS NOT NULL AND claimed_at IS NOT NULL)) AND
  (status <> 'REVOKED' OR revoked_at IS NOT NULL));
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_valid_ownership_and_usage" CHECK (
  reports_allowed > 0 AND reports_consumed BETWEEN 0 AND reports_allowed AND access_expires_at > claimed_at AND
  ((ownership = 'ANONYMOUS' AND owner_user_id IS NULL AND bound_at IS NULL) OR
   (ownership = 'ACCOUNT_BOUND' AND owner_user_id IS NOT NULL AND bound_at IS NOT NULL)) AND
  (status <> 'REVOKED' OR revoked_at IS NOT NULL));
ALTER TABLE "access_sessions" ADD CONSTRAINT "sessions_valid_digest_and_expiry" CHECK (
  token_digest ~ '^[0-9a-f]{64}$' AND expires_at > created_at);
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_valid_state" CHECK (
  ordinal > 0 AND revision >= 0 AND
  (status <> 'SUBMITTED' OR submitted_at IS NOT NULL) AND
  (status <> 'COMPLETED' OR (submitted_at IS NOT NULL AND completed_at IS NOT NULL AND answers_expire_at IS NOT NULL)));
ALTER TABLE "attempt_answers" ADD CONSTRAINT "answers_positive_revision" CHECK (revision > 0);
ALTER TABLE "reports" ADD CONSTRAINT "reports_valid_snapshot" CHECK (
  expires_at > created_at AND
  ((deleted_at IS NULL AND snapshot IS NOT NULL AND jsonb_typeof(snapshot) = 'object') OR
   (deleted_at IS NOT NULL AND snapshot IS NULL)));
ALTER TABLE "question_stats" ADD CONSTRAINT "questions_nonnegative_count" CHECK (answer_count >= 0);
ALTER TABLE "question_option_stats" ADD CONSTRAINT "question_options_nonnegative_count" CHECK (count >= 0);
ALTER TABLE "result_stats" ADD CONSTRAINT "results_nonnegative_count" CHECK (completed_count >= 0);
ALTER TABLE "result_type_stats" ADD CONSTRAINT "result_types_nonnegative_count" CHECK (count >= 0);
ALTER TABLE "campaign_assets" ADD CONSTRAINT "assets_valid_reference" CHECK (
  (byte_size IS NULL OR byte_size > 0) AND
  (storage_key IS NULL OR (storage_key !~ '(^/|\.\.)')) AND
  (status <> 'READY' OR (CASE WHEN kind IN ('COVER','VIDEO') THEN storage_key IS NOT NULL ELSE text IS NOT NULL AND length(text) > 0 END)));
ALTER TABLE "events" ADD CONSTRAINT "events_scope_and_campaign" CHECK (
  (scope <> 'DEMO' OR source = 'DEMO') AND (campaign_id IS NULL OR product_version_id IS NOT NULL));
ALTER TABLE "idempotent_requests" ADD CONSTRAINT "requests_valid_digest_and_expiry" CHECK (
  request_digest ~ '^[0-9a-f]{64}$' AND expires_at > created_at);

CREATE FUNCTION orai.prevent_version_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('PUBLISHED', 'ARCHIVED') THEN
    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Published versions cannot be deleted'; END IF;
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.product_id IS DISTINCT FROM OLD.product_id OR
      NEW.scope IS DISTINCT FROM OLD.scope OR NEW.number IS DISTINCT FROM OLD.number OR
      NEW.configuration IS DISTINCT FROM OLD.configuration OR NEW.published_at IS DISTINCT FROM OLD.published_at OR
      NEW.status NOT IN ('PUBLISHED', 'ARCHIVED') THEN
      RAISE EXCEPTION 'Published versions are immutable';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER version_immutable BEFORE UPDATE OR DELETE ON orai.product_versions
  FOR EACH ROW EXECUTE FUNCTION orai.prevent_version_rewrite();

CREATE FUNCTION orai.prevent_entitlement_reassignment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.product_version_id IS DISTINCT FROM OLD.product_version_id OR NEW.order_id IS DISTINCT FROM OLD.order_id OR
    NEW.scope IS DISTINCT FROM OLD.scope OR NEW.claimed_at IS DISTINCT FROM OLD.claimed_at OR
    NEW.access_expires_at IS DISTINCT FROM OLD.access_expires_at OR NEW.reports_allowed IS DISTINCT FROM OLD.reports_allowed OR
    NEW.reports_consumed < OLD.reports_consumed THEN RAISE EXCEPTION 'Entitlement scope and usage cannot be reset'; END IF;
  IF OLD.ownership = 'ACCOUNT_BOUND' AND
    (NEW.ownership <> 'ACCOUNT_BOUND' OR NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id OR NEW.bound_at IS DISTINCT FROM OLD.bound_at) THEN
    RAISE EXCEPTION 'Account ownership cannot be transferred or undone';
  END IF;
  IF OLD.status = 'REVOKED' AND NEW.status <> 'REVOKED' THEN RAISE EXCEPTION 'Revoked entitlement cannot be reactivated'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER entitlement_locked BEFORE UPDATE ON orai.entitlements
  FOR EACH ROW EXECUTE FUNCTION orai.prevent_entitlement_reassignment();

CREATE FUNCTION orai.prevent_attempt_version_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.entitlement_id IS DISTINCT FROM OLD.entitlement_id OR NEW.product_version_id IS DISTINCT FROM OLD.product_version_id OR
    NEW.scope IS DISTINCT FROM OLD.scope OR NEW.ordinal IS DISTINCT FROM OLD.ordinal THEN
    RAISE EXCEPTION 'Attempt version is locked';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER attempt_version_locked BEFORE UPDATE ON orai.attempts
  FOR EACH ROW EXECUTE FUNCTION orai.prevent_attempt_version_change();

CREATE FUNCTION orai.prevent_report_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.attempt_id IS DISTINCT FROM OLD.attempt_id OR NEW.product_version_id IS DISTINCT FROM OLD.product_version_id OR
    NEW.scope IS DISTINCT FROM OLD.scope OR NEW.result_type_id IS DISTINCT FROM OLD.result_type_id OR
    NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.expires_at IS DISTINCT FROM OLD.expires_at OR
    (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at) OR
    (NEW.snapshot IS DISTINCT FROM OLD.snapshot AND NOT (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND NEW.snapshot IS NULL)) THEN
    RAISE EXCEPTION 'Report snapshot is immutable; deletion preserves a tombstone';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER report_immutable BEFORE UPDATE ON orai.reports
  FOR EACH ROW EXECUTE FUNCTION orai.prevent_report_rewrite();

CREATE FUNCTION orai.check_binding_consistency() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
  target := CASE WHEN TG_TABLE_NAME = 'entitlements' THEN COALESCE(NEW.id, OLD.id) ELSE COALESCE(NEW.entitlement_id, OLD.entitlement_id) END;
  IF EXISTS (SELECT 1 FROM orai.entitlements e WHERE e.id = target AND e.ownership = 'ACCOUNT_BOUND' AND
    NOT EXISTS (SELECT 1 FROM orai.entitlement_bindings b WHERE b.entitlement_id = e.id AND b.user_id = e.owner_user_id)) THEN
    RAISE EXCEPTION 'Account ownership requires its unique binding';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER entitlement_binding_consistent AFTER INSERT OR UPDATE ON orai.entitlements
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION orai.check_binding_consistency();
CREATE CONSTRAINT TRIGGER binding_entitlement_consistent AFTER INSERT OR UPDATE OR DELETE ON orai.entitlement_bindings
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION orai.check_binding_consistency();

-- This private schema is accessed only by the backend; Supabase auth is untouched.
REVOKE ALL ON SCHEMA orai FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA orai FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA orai FROM PUBLIC;
DO $$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'authenticator'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA orai FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA orai FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA orai FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
COMMIT;
