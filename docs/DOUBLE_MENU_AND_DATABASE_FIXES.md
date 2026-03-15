# 🔧 Double Menu & Database Relationship Fixes

## Overview

Successfully resolved two critical issues:

1. **Double Menu Problem**: Fixed duplicate navigation headers on `/apply/draft/:id` route
2. **Database Relationship Query Issue**: Fixed "Application not found" error caused by ambiguous foreign key relationships

## ✅ Issue 1: Double Menu Problem

### Root Cause Analysis

The `/apply/draft/:id` route had **double AppLayout wrapping**:

**Route Definition (App.tsx):**

```typescript
<Route
  path="/apply/draft/:id"
  element={
    <OnboardingRequired>
      <AppLayout>
        {' '}
        // ← First AppLayout
        <GrantDraft />
      </AppLayout>
    </OnboardingRequired>
  }
/>
```

**GrantDraft.tsx Component:**

```typescript
export default function GrantDraft() {
  return (
    <ProtectedRoute>
      <AppLayout>
        {' '}
        // ← Second AppLayout (DUPLICATE!)
        <GrantDraftEditor />
      </AppLayout>
    </ProtectedRoute>
  );
}
```

### Solution Implemented

**File: `src/pages/GrantDraft.tsx`**

- Removed the inner `AppLayout` wrapper
- Kept only the `ProtectedRoute` wrapper
- Now the component structure is:

```typescript
export default function GrantDraft() {
  return (
    <ProtectedRoute>
      <GrantDraftEditor /> // ← No duplicate AppLayout
    </ProtectedRoute>
  );
}
```

### Result

- ✅ `/apply/draft/:id` now has single navigation header
- ✅ All other routes maintain their correct navigation structure
- ✅ No breaking changes to existing functionality

## ✅ Issue 2: Database Relationship Query Problem

### Root Cause Analysis

The database had **multiple foreign key relationships** between `grant_applications` and `organizations`:

1. `fk_grant_applications_organization_id` (from migration 20250814192715)
2. `fk_grant_applications_organization` (from migration 20250815193528)

When the query tried to join `organizations`, Supabase couldn't determine which relationship to use:

```sql
-- This failed with PGRST201 error
SELECT *, organizations(name, mission, org_type)
FROM grant_applications
WHERE id = ?
```

### Solution Implemented

**File: `src/components/grant-draft/GrantDraftEditor.tsx`**

- Updated the query to specify the exact foreign key relationship
- Changed from:

```typescript
.select(`
  *,
  organizations (
    name,
    mission,
    org_type
  )
`)
```

- To:

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

### Result

- ✅ Applications now load correctly after creation
- ✅ No more "Application not found" errors
- ✅ Database relationships work as expected
- ✅ All existing functionality preserved

## 🎯 Navigation Structure After Fixes

### ✅ Single Menu Routes

```
/app (ApplicationLanding) - Has its own header ✅
/applications - Uses AppLayout ✅
/grants - Uses AppLayout ✅
/settings - Uses AppLayout ✅
/apply/draft/:id - Uses AppLayout (no longer double) ✅
```

### ✅ React Router Navigation

All navigation links now use React Router `Link` components:

- **ApplicationLanding.tsx**: Settings, Help, and brand links
- **AppLayout.tsx**: All navigation links (Applications, Grants, Settings, Help)
- **Index.tsx**: Brand link and theme toggle added

## 🔧 Technical Details

### Database Schema

The `grant_applications` table has:

- `organization_id` column with foreign key constraint
- Multiple foreign key relationships (now properly specified in queries)
- RLS policies for user access control

### Component Architecture

- **Route-level layout**: AppLayout provided by route definitions
- **Component-level protection**: ProtectedRoute for authentication
- **No duplicate wrappers**: Each component has exactly one layout wrapper

### Theme System

- **Default theme**: Set to "light" in App.tsx
- **Theme toggle**: Available on all pages (public and authenticated)
- **Smooth transitions**: Proper CSS transitions between themes

## 🚀 Testing Checklist

### Navigation Testing

- [x] Create application → redirect to draft editor (no "Application not found")
- [x] Navigate to Settings from `/app` page (no full page reload)
- [x] Navigate to Settings from other authenticated pages
- [x] Theme toggle works on public landing page
- [x] Theme toggle works on all authenticated pages

### Menu Structure Testing

- [x] `/apply/draft/:id` has single navigation header
- [x] All other pages maintain correct navigation
- [x] No duplicate menus anywhere in the application

### Database Testing

- [x] Application creation works correctly
- [x] Application loading works after creation
- [x] Organization data loads properly in draft editor
- [x] No PGRST201 relationship errors

## 📋 Files Modified

1. **`src/pages/GrantDraft.tsx`**

   - Removed duplicate AppLayout wrapper
   - Simplified component structure

2. **`src/components/grant-draft/GrantDraftEditor.tsx`**

   - Fixed database relationship query
   - Specified exact foreign key constraint

3. **`src/pages/ApplicationLanding.tsx`** (previous fix)

   - Converted navigation links to React Router Link
   - Added theme toggle to header

4. **`src/components/layout/AppLayout.tsx`** (previous fix)

   - Converted all navigation links to React Router Link
   - Added theme toggle to header

5. **`src/pages/Index.tsx`** (previous fix)

   - Added theme toggle to public landing page
   - Converted brand link to React Router Link

6. **`src/App.tsx`** (previous fix)
   - Set default theme to "light"
   - Added ThemeProvider wrapper

## 🎉 Summary

Both critical issues have been resolved:

1. **Double Menu**: Eliminated duplicate navigation headers by removing redundant AppLayout wrapper
2. **Database Query**: Fixed relationship ambiguity by specifying exact foreign key constraint
3. **Navigation**: All links now use React Router for SPA navigation
4. **Theme System**: Complete dark mode support with light as default

The application now provides a consistent, smooth user experience with proper navigation and reliable data loading.
