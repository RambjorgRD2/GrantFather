-- Fix application-organization relationship
-- This migration ensures the foreign key relationship exists for proper joins

-- First, check if the foreign key constraint exists
DO $$
BEGIN
    -- Check if the foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_grant_applications_organization_id'
        AND table_name = 'grant_applications'
    ) THEN
        -- Add the foreign key constraint if it doesn't exist
        ALTER TABLE grant_applications 
        ADD CONSTRAINT fk_grant_applications_organization_id 
        FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint fk_grant_applications_organization_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_grant_applications_organization_id already exists';
    END IF;
END $$;

-- Ensure the organization_id column exists and is not null
ALTER TABLE grant_applications 
ALTER COLUMN organization_id SET NOT NULL;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_grant_applications_organization_id 
ON grant_applications(organization_id);

-- Create an index for user_id as well
CREATE INDEX IF NOT EXISTS idx_grant_applications_user_id 
ON grant_applications(user_id);

-- Create a composite index for common queries
CREATE INDEX IF NOT EXISTS idx_grant_applications_user_org 
ON grant_applications(user_id, organization_id);
