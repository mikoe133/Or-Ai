CREATE TABLE "orai"."account_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "scope" "orai"."DataScope" NOT NULL,
    "supabase_session_id" UUID NOT NULL,
    "token_digest" TEXT NOT NULL,
    "access_credential" TEXT,
    "refresh_credential" TEXT,
    "access_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    CONSTRAINT "account_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "account_sessions_credentials_check" CHECK (
      ("revoked_at" IS NULL AND "access_credential" IS NOT NULL AND "refresh_credential" IS NOT NULL)
      OR ("revoked_at" IS NOT NULL AND "access_credential" IS NULL AND "refresh_credential" IS NULL)
    ),
    CONSTRAINT "account_sessions_digest_check" CHECK ("token_digest" ~ '^[0-9a-f]{64}$')
);
CREATE UNIQUE INDEX "account_sessions_token_digest_key" ON "orai"."account_sessions"("token_digest");
CREATE UNIQUE INDEX "account_sessions_id_scope_key" ON "orai"."account_sessions"("id", "scope");
CREATE UNIQUE INDEX "account_sessions_supabase_session_id_scope_key" ON "orai"."account_sessions"("supabase_session_id", "scope");
CREATE INDEX "account_sessions_user_id_scope_revoked_at_idx" ON "orai"."account_sessions"("user_id", "scope", "revoked_at");
CREATE INDEX "account_sessions_expires_at_idx" ON "orai"."account_sessions"("expires_at");
ALTER TABLE "orai"."account_sessions" ADD CONSTRAINT "account_sessions_user_id_scope_fkey" FOREIGN KEY ("user_id", "scope") REFERENCES "orai"."users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;
