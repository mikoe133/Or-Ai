CREATE TABLE orai.request_rate_buckets (
  key_hash TEXT PRIMARY KEY,
  scope orai."DataScope" NOT NULL,
  hits INTEGER NOT NULL DEFAULT 1,
  window_ends_at TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT request_rate_bucket_valid CHECK (key_hash ~ '^[0-9a-f]{64}$' AND hits > 0)
);
CREATE INDEX request_rate_buckets_window_ends_at_idx ON orai.request_rate_buckets(window_ends_at);
