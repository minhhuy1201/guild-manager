-- A plain Postgres has none of Supabase's `anon` / `authenticated` roles, so the migration
-- `20260802185500_chan_data_api_truy_cap_bang` (which REVOKEs the Data API's privileges) fails
-- with `role "anon" does not exist` on an empty local database.
--
-- Creating both as NOLOGIN roles up front lets the migrations replay exactly as on production.
-- Development only: this file runs once at the container's initdb and has no counterpart on the
-- real database.
CREATE ROLE "anon" NOLOGIN;
CREATE ROLE "authenticated" NOLOGIN;
