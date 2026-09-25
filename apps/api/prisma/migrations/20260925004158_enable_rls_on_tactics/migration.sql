-- Enable RLS on the two tables 20260920172959_add_tactics created without it.
--
-- The Data API is shut out in two layers (see 20260802185500_chan_data_api_truy_cap_bang): revoked
-- grants for `anon`/`authenticated`, which ALTER DEFAULT PRIVILEGES carries to new tables, and RLS,
-- which it does not. These two tables were left with the first layer only.
--
-- The app connects as `postgres` (rolbypassrls = true), so runtime is unaffected. No policy is
-- created: RLS without a policy denies everything.

ALTER TABLE "Tactic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TacticTokenPreset" ENABLE ROW LEVEL SECURITY;
