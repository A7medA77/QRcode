/*
# Create orders table for smart pickup system (single-tenant, no auth)

1. New Tables
- `orders`
  - `id` (bigint identity primary key) — the public order number shown to customer and cashier
  - `status` (text, not null, default 'preparing') — one of: preparing | ready | completed
  - `created_at` (timestamptz, default now()) — when the cashier issued the order
  - `ready_at` (timestamptz, nullable) — when the kitchen marked it ready
  - `prep_seconds` (integer, default 0) — total preparation time in seconds
  - `rating` (integer, nullable) — customer star rating 1-5
  - `feedback` (text, nullable) — private feedback for ratings 3 and below
  - `google_review_clicked` (boolean, default false) — customer clicked through to Google Maps review
  - `completed_at` (timestamptz, nullable) — when the customer confirmed pickup / submitted rating

2. Security
- Enable RLS on `orders`.
- Grant SELECT + INSERT to anon and authenticated (no sign-in: customers scan a QR code).
- Grant UPDATE only on the columns the app needs (status, rating, feedback, timing fields) — not the identity column.
- Four separate policies (select/insert/update/delete) scoped to anon + authenticated since this app has no sign-in.
- Add the orders table to the supabase_realtime publication so both screens live-update.

3. Notes
- Single-tenant coffee shop app: data is intentionally shared between the merchant counter screen and any customer who scans the order QR code.
*/

CREATE TABLE IF NOT EXISTS orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  status text NOT NULL DEFAULT 'preparing',
  created_at timestamptz NOT NULL DEFAULT now(),
  ready_at timestamptz,
  prep_seconds integer NOT NULL DEFAULT 0,
  rating integer,
  feedback text,
  google_review_clicked boolean NOT NULL DEFAULT false,
  completed_at timestamptz
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON orders TO anon, authenticated;
GRANT UPDATE (status, ready_at, prep_seconds, rating, feedback, google_review_clicked, completed_at) ON orders TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_orders" ON orders;
CREATE POLICY "anon_select_orders" ON orders
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders
FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_orders" ON orders;
CREATE POLICY "anon_update_orders" ON orders
FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_orders" ON orders;
CREATE POLICY "anon_delete_orders" ON orders
FOR DELETE TO anon, authenticated USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
END $$;
