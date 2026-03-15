# Phase 5: Testing & Validation Guide

## Overview
This document outlines the comprehensive testing strategy to validate all 5 phases of the AI Grant Writer improvements.

## Test Matrix

### 1. Build System Tests ✓

**Objective**: Verify `index.html` build error is resolved

**Tests**:
- [ ] Clean build succeeds without EISDIR error
- [ ] Build completes in <60 seconds
- [ ] `index.html` exists as a file (not directory) after build
- [ ] Vite cache is properly cleared before build

**How to Test**:
```bash
# Clean and rebuild
rm -rf dist node_modules/.vite
npm run build:dev

# Verify index.html is a file
ls -la index.html
file index.html  # Should show "HTML document"
```

**Success Criteria**:
- Build completes without errors
- `index.html` is a valid HTML file
- No EISDIR errors in console

---

### 2. Edge Function Deployment Tests ✓

**Objective**: Verify new edge function version is deployed

**Tests**:
- [ ] Health check returns version 2.0.1
- [ ] Deployment timestamp is recent
- [ ] All API keys show as configured
- [ ] Function boots without errors

**How to Test**:
```bash
# Call health check endpoint
curl https://fjlrplhtgknuulqymsse.supabase.co/functions/v1/ai-grant-writer/health

# Check edge function logs
# Navigate to: https://supabase.com/dashboard/project/fjlrplhtgknuulqymsse/functions/ai-grant-writer/logs
```

**Expected Response**:
```json
{
  "status": "healthy",
  "version": "2.0.1",
  "deployed_at": "2025-10-14T...",
  "timestamp": "2025-10-14T...",
  "openaiKeyConfigured": true,
  "anthropicKeyConfigured": true,
  "googleKeyConfigured": true
}
```

**Success Criteria**:
- Version shows 2.0.1
- All API keys configured
- No "model is not defined" errors in logs

---

### 3. AI Generation Tests ✓

**Objective**: Verify AI content generation works correctly

**Tests**:
- [ ] Generate section with GPT-5 succeeds
- [ ] Generate section with GPT-4.1 succeeds
- [ ] Generate full draft succeeds
- [ ] Multiple providers work (OpenAI, Anthropic, Google)
- [ ] Response time <5s for section generation

**How to Test**:
```typescript
// In the application, navigate to grant draft editor
// Try generating content for each section
// Monitor console for timing and errors

// Test different models:
// 1. GPT-5 (gpt-5-2025-08-07)
// 2. GPT-4.1 (gpt-4.1-2025-04-14)
// 3. Claude Sonnet 4.5 (if configured)
```

**Success Criteria**:
- Content generates successfully
- No empty responses
- Response time <5s
- No console errors

---

### 4. Error Recovery Tests ✓

**Objective**: Verify reasoning model error handling and fallback

**Tests**:
- [ ] Reasoning model (o3, o4) errors trigger fallback to GPT-4.1
- [ ] Exponential backoff retry works on rate limits
- [ ] User-friendly error messages display
- [ ] No page freezes on errors
- [ ] Error logging includes context

**How to Test**:

**Test Fallback Mechanism**:
```typescript
// Use a complex prompt with o3 or o4 model
// Expected: Automatic fallback to GPT-4.1
// Check console logs for fallback message
```

**Test Rate Limiting**:
```bash
# Make multiple rapid requests
# Expected: Exponential backoff with retry
# Should eventually succeed
```

**Test Error Messages**:
- Disconnect internet → Should show network error
- Use invalid API key → Should show auth error
- Complex prompt → Should fallback automatically

**Success Criteria**:
- Fallback to GPT-4.1 happens automatically
- Clear error messages shown to users
- No undefined errors or crashes
- Console logs show detailed error context

---

### 5. Cache Management Tests ✓

**Objective**: Verify organization cache prevents RPC timeouts

**Tests**:
- [ ] Organization data cached after first fetch
- [ ] Cache size limited to 100 entries (LRU)
- [ ] Cache hit rate >80% during normal use
- [ ] No RPC timeout errors
- [ ] Cache clears on auth changes

**How to Test**:
```typescript
// In AuthProvider, monitor cache behavior
// 1. Load multiple applications from same org
// 2. Check console for cache hits
// 3. Monitor RPC call count

// Expected logs:
// "📦 Cache HIT for organization: <id>"
// "📦 Cache MISS for organization: <id>"
```

**Success Criteria**:
- Cache hits logged for repeat requests
- LRU eviction works when size >100
- No RPC timeout errors in normal use
- Organization data loads <100ms from cache

---

### 6. Integration Tests ✓

**Objective**: Verify all phases work together seamlessly

**Tests**:
- [ ] Full user workflow: Login → Create app → Generate content → Edit → Save
- [ ] No memory leaks during extended use
- [ ] Multiple concurrent users supported
- [ ] Error recovery doesn't break subsequent requests
- [ ] Analytics tracking works

**How to Test**:
```bash
# Run Cypress tests
npm run test:e2e:ai
npm run test:e2e:applications

# Run performance tests
npm run test:e2e:ai-performance
```

**User Workflow Test**:
1. Login as test user
2. Create new grant application
3. Generate introduction section
4. Regenerate with different tone
5. Generate full draft
6. Edit content manually
7. Save and verify persistence
8. Check no console errors

**Success Criteria**:
- All Cypress tests pass
- No console errors throughout workflow
- Response times within acceptable limits
- Data persists correctly

---

## Performance Benchmarks

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Build time | <60s | TBD | 🔄 |
| Section generation | <5s | TBD | 🔄 |
| Full draft generation | <30s | TBD | 🔄 |
| Cache hit rate | >80% | TBD | 🔄 |
| Error rate | <1% | TBD | 🔄 |
| Health check response | <100ms | TBD | 🔄 |

---

## Regression Tests

Before marking complete, verify these don't break:

- [ ] User authentication flow
- [ ] Organization switching
- [ ] File uploads
- [ ] Knowledge base integration
- [ ] Notification system
- [ ] Dark mode toggle
- [ ] Language switching
- [ ] PDF export

---

## Monitoring Setup

### Edge Function Monitoring
```bash
# Set up alerts for:
# - Error rate >1%
# - Response time >10s
# - Function crashes

# Monitor in Supabase Dashboard:
# https://supabase.com/dashboard/project/fjlrplhtgknuulqymsse/functions/ai-grant-writer/logs
```

### Application Monitoring
```typescript
// Add to error boundaries
console.error('[ERROR]', {
  component: 'ComponentName',
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString()
});
```

---

## Rollback Plan

If critical issues discovered:

1. **Immediate**: Revert to previous edge function version via Supabase Dashboard
2. **Build Issues**: Remove prebuild script from package.json temporarily
3. **Cache Issues**: Comment out cache logic in AuthProvider
4. **Full Rollback**: Restore from backup commit before Phase 1

---

## Sign-off Checklist

Phase 1 - Edge Function Redeployment:
- [ ] Version 2.0.1 deployed and verified
- [ ] "model is not defined" error resolved
- [ ] All logs show correct version

Phase 2 - Build Cache Fix:
- [ ] Prebuild script created and working
- [ ] index.html EISDIR error resolved
- [ ] Clean builds succeed consistently

Phase 3 - Deployment Verification:
- [ ] Health check endpoint returns version
- [ ] Deployment timestamp logged
- [ ] API key status visible

Phase 4 - Error Recovery:
- [ ] Automatic fallback to GPT-4.1 works
- [ ] Exponential backoff implemented
- [ ] User-friendly error messages shown

Phase 5 - Testing & Validation:
- [ ] All test suites pass
- [ ] Performance benchmarks met
- [ ] No regressions detected

---

## Next Steps After Testing

1. Document any issues found
2. Create tickets for minor issues
3. Deploy to production when all tests pass
4. Monitor production metrics for 48 hours
5. Collect user feedback
6. Plan Phase 6 improvements if needed

---

## Contact & Support

- Edge Function Logs: https://supabase.com/dashboard/project/fjlrplhtgknuulqymsse/functions/ai-grant-writer/logs
- Documentation: See MITIGATION_COMPLETE.md
- Issues: Create GitHub issue with [BUG] tag
