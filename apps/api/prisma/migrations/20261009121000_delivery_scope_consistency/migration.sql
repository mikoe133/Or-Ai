BEGIN;
-- Delivery references must preserve both the original order and data scope,
-- including empty batches and replacement codes, before any API is introduced.
CREATE UNIQUE INDEX "orders_id_scope_key" ON orai.orders (id, scope);
CREATE UNIQUE INDEX "entitlements_delivery_key" ON orai.entitlements (id, order_id, product_version_id, scope);
CREATE UNIQUE INDEX "redemption_codes_delivery_key" ON orai.redemption_codes (id, order_id, product_version_id, scope);
CREATE UNIQUE INDEX "redemption_codes_replacement_key" ON orai.redemption_codes (replaces_code_id, order_id, product_version_id, scope);

ALTER TABLE orai.code_batches DROP CONSTRAINT "code_batches_order_id_fkey";
ALTER TABLE orai.code_batches ADD CONSTRAINT "code_batches_order_id_scope_fkey"
  FOREIGN KEY (order_id, scope) REFERENCES orai.orders (id, scope) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE orai.redemption_codes DROP CONSTRAINT "redemption_codes_entitlement_id_product_version_id_scope_fkey";
ALTER TABLE orai.redemption_codes ADD CONSTRAINT "redemption_codes_entitlement_delivery_fkey"
  FOREIGN KEY (entitlement_id, order_id, product_version_id, scope)
  REFERENCES orai.entitlements (id, order_id, product_version_id, scope) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE orai.redemption_codes DROP CONSTRAINT "redemption_codes_replaces_code_id_fkey";
ALTER TABLE orai.redemption_codes ADD CONSTRAINT "redemption_codes_replacement_delivery_fkey"
  FOREIGN KEY (replaces_code_id, order_id, product_version_id, scope)
  REFERENCES orai.redemption_codes (id, order_id, product_version_id, scope) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE orai.redemption_codes ADD CONSTRAINT "redemption_codes_not_self_replacement"
  CHECK (replaces_code_id IS NULL OR replaces_code_id <> id);
COMMIT;
