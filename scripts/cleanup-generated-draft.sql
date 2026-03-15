-- Clean up incorrect generated_draft data
-- This script removes the old format data so it can be regenerated properly

-- Update applications with old generated_draft format to NULL
UPDATE grant_applications 
SET generated_draft = NULL 
WHERE generated_draft::text LIKE '%"created_via"%' 
   OR generated_draft::text LIKE '%"funding_amount"%'
   OR generated_draft::text NOT LIKE '%"introduction"%';

-- Log the cleanup
INSERT INTO debug_logs (action, details) 
VALUES (
  'cleanup_generated_draft', 
  jsonb_build_object(
    'affected_rows', (SELECT COUNT(*) FROM grant_applications WHERE generated_draft IS NULL),
    'timestamp', now()
  )
);
