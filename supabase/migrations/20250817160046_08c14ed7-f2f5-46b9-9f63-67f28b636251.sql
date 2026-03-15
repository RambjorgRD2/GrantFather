-- NEUTRALIZED: This migration previously contained destructive DELETEs
-- (including DELETE FROM auth.users) that were development-only data resets.
-- It has been replaced with a no-op to prevent accidental data loss in
-- any environment where migrations are replayed.
SELECT 1;
