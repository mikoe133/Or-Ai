#!/bin/sh
set -eu
# Runs once on this dedicated Auth volume. Never connects to the business DB.
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=ON_ERROR_STOP=1 --set=auth_password="$POSTGRES_PASSWORD" <<'SQL'
CREATE ROLE supabase_auth_admin LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD :'auth_password';
CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
ALTER ROLE supabase_auth_admin SET search_path = auth;
GRANT CONNECT, CREATE ON DATABASE orai_auth TO supabase_auth_admin;
SQL
