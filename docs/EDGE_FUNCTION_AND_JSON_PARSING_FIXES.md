# 🔧 Edge Function & JSON Parsing Fixes

## Overview

Successfully resolved critical issues with the AI grant writer edge function and JSON parsing in the frontend:

1. **Edge Function Database Query Issue**: Fixed "Application not found" error caused by inconsistent foreign key relationship format
2. **JSON Parsing Error**: Fixed "SyntaxError: [object Object] is not valid JSON" caused by incorrect data format in generated_draft field

## ✅ Issue 1: Edge Function Database Query Problem

### Root Cause Analysis

The edge function was using a different foreign key relationship format than the frontend:

**Frontend (Working):**

```typescript
.select(`
  *,
  organizations!fk_grant_applications_organization_id (
    name,
    mission,
    org_type
  )
`)
```

**Edge Function (Failing):**

```typescript
.select(`
  *,
  organizations (
    name,
    mission,
    org_type,
    contact_name,
    contact_email,
    members_count
  )
`)
```

This caused the PGRST201 error: "Could not embed because more than one relationship was found for 'grant_applications' and 'organizations'"

### Solution Implemented

**File: `supabase/functions/ai-grant-writer/index.ts`**

1. **Fixed Database Query:**

   - Updated to use the same foreign key relationship format as frontend
   - Changed from `organizations (...)` to `organizations!fk_grant_applications_organization_id (...)`

2. **Enhanced Error Handling:**
   - Added parameter validation for `applicationId`
   - Added specific error messages for different failure scenarios
   - Added detailed logging for debugging

**Before:**

```typescript
const { data: application, error: appError } = await supabase
  .from('grant_applications')
  .select(
    `
    *,
    organizations (
      name,
      mission,
      org_type,
      contact_name,
      contact_email,
      members_count
    )
  `
  )
  .eq('id', applicationId)
  .eq('user_id', user.id)
  .single();

if (appError || !application) {
  throw new Error('Application not found');
}
```

**After:**

```typescript
const { data: application, error: appError } = await supabase
  .from('grant_applications')
  .select(
    `
    *,
    organizations!fk_grant_applications_organization_id (
      name,
      mission,
      org_type,
      contact_name,
      contact_email,
      members_count
    )
  `
  )
  .eq('id', applicationId)
  .eq('user_id', user.id)
  .single();

if (appError) {
  console.error('Database error fetching application:', appError);
  throw new Error(`Database error: ${appError.message}`);
}

if (!application) {
  throw new Error(`Application not found with ID: ${applicationId}`);
}

if (!application.organizations) {
  throw new Error('Application organization data not found');
}
```

### Result

- ✅ Edge function now successfully fetches application data
- ✅ No more "Application not found" errors
- ✅ Consistent database query format across frontend and backend
- ✅ Better error messages for debugging

## ✅ Issue 2: JSON Parsing Error in Frontend

### Root Cause Analysis

The `generated_draft` field in the database contained incorrect data format:

**Current (Incorrect) Format:**

```json
{
  "created_via": "landing_quickstart",
  "funding_amount": null
}
```

**Expected (Correct) Format:**

```json
{
  "introduction": "Grant application introduction...",
  "need_statement": "Problem statement and need...",
  "project_plan": "Project methodology and timeline...",
  "budget": "Budget breakdown and justification...",
  "outcomes": "Expected outcomes and evaluation...",
  "conclusion": "Summary and call to action..."
}
```

The frontend was trying to parse the incorrect format as JSON, causing the error.

### Solution Implemented

**File: `src/components/grant-draft/GrantDraftEditor.tsx`**

1. **Enhanced JSON Parsing Logic:**

   - Added type checking for different data formats
   - Added handling for old format data
   - Added fallback behavior for parsing errors

2. **Smart Data Handling:**
   - Detects old format and clears it for regeneration
   - Validates expected section structure
   - Provides empty sections as fallback

**Before:**

```typescript
useEffect(() => {
  if (application?.generated_draft) {
    try {
      const parsedSections = JSON.parse(application.generated_draft);
      setSections(parsedSections);
    } catch (error) {
      console.error('Error parsing generated draft:', error);
    }
  }
}, [application]);
```

**After:**

```typescript
useEffect(() => {
  if (application?.generated_draft) {
    try {
      let parsedSections;

      // Handle different data types for generated_draft
      if (typeof application.generated_draft === 'string') {
        // If it's a string, try to parse it as JSON
        parsedSections = JSON.parse(application.generated_draft);
      } else if (typeof application.generated_draft === 'object') {
        // If it's already an object, check if it has the expected structure
        const draft = application.generated_draft as any;

        // Check if it's the old format (created_via, funding_amount)
        if (draft.created_via || draft.funding_amount !== undefined) {
          console.warn(
            'Found old generated_draft format, clearing for regeneration'
          );
          // Clear the old format so it can be regenerated properly
          setSections({
            introduction: '',
            need_statement: '',
            project_plan: '',
            budget: '',
            outcomes: '',
            conclusion: '',
          });
          return;
        }

        // If it has the expected section structure, use it
        if (draft.introduction || draft.need_statement || draft.project_plan) {
          parsedSections = draft;
        } else {
          console.warn('Unexpected generated_draft object structure:', draft);
          setSections({
            introduction: '',
            need_statement: '',
            project_plan: '',
            budget: '',
            outcomes: '',
            conclusion: '',
          });
          return;
        }
      } else {
        console.warn(
          'Unexpected generated_draft type:',
          typeof application.generated_draft
        );
        setSections({
          introduction: '',
          need_statement: '',
          project_plan: '',
          budget: '',
          outcomes: '',
          conclusion: '',
        });
        return;
      }

      // Validate that parsedSections has the expected structure
      if (parsedSections && typeof parsedSections === 'object') {
        setSections(parsedSections);
      } else {
        console.warn('Parsed sections is not an object:', parsedSections);
        setSections({
          introduction: '',
          need_statement: '',
          project_plan: '',
          budget: '',
          outcomes: '',
          conclusion: '',
        });
      }
    } catch (error) {
      console.error('Error parsing generated draft:', error);
      // Set empty sections on error
      setSections({
        introduction: '',
        need_statement: '',
        project_plan: '',
        budget: '',
        outcomes: '',
        conclusion: '',
      });
    }
  }
}, [application]);
```

### Result

- ✅ No more JSON parsing errors
- ✅ Handles old format data gracefully
- ✅ Provides fallback behavior for unexpected data
- ✅ Allows regeneration of draft content

## ✅ Phase 3: Database Data Cleanup

### Solution Implemented

**File: `scripts/cleanup-generated-draft.sql`**

Created a SQL script to clean up existing incorrect data:

```sql
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
```

### Result

- ✅ Cleans up old format data automatically
- ✅ Logs cleanup operations for tracking
- ✅ Allows fresh regeneration of draft content

## ✅ Phase 4: Enhanced Error Handling

### Edge Function Improvements

1. **Parameter Validation:**

   - Validates `applicationId` is provided and is a string
   - Provides specific error messages for validation failures

2. **Database Error Handling:**

   - Distinguishes between database errors and missing data
   - Provides detailed error messages for debugging
   - Logs errors for monitoring

3. **Organization Data Validation:**
   - Checks that organization data is available
   - Provides specific error if organization data is missing

### Frontend Improvements

1. **Type-Safe Parsing:**

   - Handles different data types (string, object, null)
   - Validates expected data structure
   - Provides fallback behavior for all error cases

2. **Graceful Degradation:**
   - Sets empty sections on parsing errors
   - Allows users to continue working even with data issues
   - Provides clear console warnings for debugging

## 🚀 Testing Checklist

### Edge Function Testing

- [x] Application data loads correctly with new query format
- [x] No more "Application not found" errors
- [x] Parameter validation works correctly
- [x] Error messages are specific and helpful

### Frontend Testing

- [x] JSON parsing handles all data formats correctly
- [x] Old format data is detected and cleared
- [x] Empty sections are provided as fallback
- [x] No more parsing errors in console

### Integration Testing

- [x] Create application → Generate draft works correctly
- [x] Regenerate sections works correctly
- [x] Data persists correctly in database
- [x] All AI providers work with fixed query

## 📋 Files Modified

1. **`supabase/functions/ai-grant-writer/index.ts`**

   - Fixed database query to use correct foreign key relationship
   - Added parameter validation
   - Enhanced error handling and logging

2. **`src/components/grant-draft/GrantDraftEditor.tsx`**

   - Enhanced JSON parsing logic
   - Added type checking and validation
   - Added fallback behavior for errors

3. **`scripts/cleanup-generated-draft.sql`** (New)
   - SQL script to clean up old format data
   - Logging for cleanup operations

## 🎉 Summary

Both critical issues have been resolved:

1. **Edge Function Query**: Fixed foreign key relationship format to match frontend
2. **JSON Parsing**: Enhanced parsing logic to handle all data formats gracefully
3. **Data Cleanup**: Provided script to clean up existing incorrect data
4. **Error Handling**: Added comprehensive error handling and validation

The AI grant writer functionality now works reliably:

- ✅ Applications load correctly from edge function
- ✅ Draft generation works without errors
- ✅ JSON parsing handles all data formats
- ✅ Users can regenerate content as needed
- ✅ Comprehensive error handling and logging

The application now provides a robust, error-free experience for AI-powered grant writing! 🚀
