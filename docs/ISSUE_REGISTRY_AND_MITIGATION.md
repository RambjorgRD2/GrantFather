# 🔧 ISSUE REGISTRY & MITIGATION ROADMAP

**Generated:** October 14, 2025  
**Application:** GrantFather  
**Purpose:** Detailed issue tracking and remediation strategies

---

## 📋 TABLE OF CONTENTS

1. [Critical Issues (P0)](#critical-issues-p0)
2. [High Priority Issues (P1)](#high-priority-issues-p1)
3. [Medium Priority Issues (P2)](#medium-priority-issues-p2)
4. [Low Priority Issues (P3)](#low-priority-issues-p3)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Testing Strategy](#testing-strategy)

---

## 🔴 CRITICAL ISSUES (P0)

### P0-1: Supabase Service Role Key Not Configured

**Category:** Configuration / Testing  
**Severity:** Critical  
**Impact:** Tests cannot run, database validation impossible  
**Affected Systems:** Cypress test suite, database task system

#### Root Cause

The `CYPRESS_SUPABASE_SERVICE_ROLE_KEY` environment variable is not set, causing all database tasks to be disabled during test execution.

#### Evidence

```bash
⚠️  Supabase Service Role key not provided. Database tasks will be disabled.
```

**File:** `cypress.config.cjs:106`

```javascript
if (!serviceRoleKey) {
  console.warn(
    '⚠️  Supabase Service Role key not provided. Database tasks will be disabled.'
  );
}
```

#### Impact Assessment

- **Severity:** 🔴 Critical
- **User Impact:** Cannot validate application functionality
- **Business Impact:** Cannot deploy with confidence
- **Security Impact:** Low (test environment only)
- **Performance Impact:** None

#### Proposed Solution

**Step 1: Obtain Service Role Key**

```bash
# From Supabase Dashboard:
# 1. Navigate to Project Settings > API
# 2. Copy the service_role key (secret)
# 3. Store securely in password manager
```

**Step 2: Configure Environment**

```bash
# Option A: .env.local file (local development)
echo "CYPRESS_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here" >> .env.local

# Option B: Environment variable (CI/CD)
export CYPRESS_SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"

# Option C: cypress.env.json (not recommended - security risk)
```

**Step 3: Verify Configuration**

```bash
# Run a simple test to verify
npm run test:e2e:core

# Should see:
# ✅ Supabase client initialized successfully
```

#### Implementation Effort

- **Time:** 15-30 minutes
- **Complexity:** Low
- **Dependencies:** None
- **Testing Required:** Run one test file to verify

#### Verification Steps

1. Set environment variable
2. Run `npm run test:e2e:core`
3. Verify no "Service Role key not provided" warning
4. Confirm database tasks execute successfully
5. Check test data seeding works

---

### P0-2: Dev Server Accessibility for Tests

**Category:** Infrastructure / CI/CD  
**Severity:** Critical  
**Impact:** Cannot execute end-to-end tests  
**Affected Systems:** Cypress test execution

#### Root Cause

Cypress tests require the development server to be running on `http://localhost:8080`, but the server isn't accessible or not started before test execution.

#### Evidence

```bash
Cypress failed to verify that your server is running.
Please start this server and then run Cypress again.
```

**File:** `cypress.config.cjs:34`

```javascript
e2e: {
  baseUrl: 'http://localhost:8080',
  // ...
}
```

#### Impact Assessment

- **Severity:** 🔴 Critical
- **User Impact:** Cannot run E2E tests
- **Business Impact:** Cannot validate application behavior
- **Security Impact:** Low
- **Performance Impact:** None

#### Proposed Solution

**Option 1: Use start-server-and-test (Recommended)**

```bash
# Already configured in package.json
npm run test:e2e:core  # Uses start-server-and-test

# This command:
# 1. Starts dev server
# 2. Waits for http://localhost:8080
# 3. Runs tests
# 4. Stops server
```

**Option 2: Manual Server Start**

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Wait for server, then run tests
sleep 10 && npm run cypress:run
```

**Option 3: CI/CD Script**

```bash
#!/bin/bash
# scripts/run-tests-ci.sh

# Start server in background
npm run dev &
SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server..."
npx wait-on http://localhost:8080 --timeout 60000

# Run tests
npm run cypress:run
TEST_EXIT_CODE=$?

# Cleanup
kill $SERVER_PID

exit $TEST_EXIT_CODE
```

#### Implementation Effort

- **Time:** 30-60 minutes
- **Complexity:** Low-Medium
- **Dependencies:** start-server-and-test package (already installed)
- **Testing Required:** Run full test suite

#### Verification Steps

1. Run `npm run test:e2e:core`
2. Verify server starts automatically
3. Verify tests execute
4. Verify server stops after tests
5. Check exit codes are correct

---

## 🟠 HIGH PRIORITY ISSUES (P1)

### P1-1: Complex AuthProvider State Management

**Category:** Code Quality / Reliability  
**Severity:** High  
**Impact:** Potential auth bugs, difficult to debug and maintain  
**Affected Systems:** Authentication, user sessions

#### Root Cause Analysis

**File:** `src/providers/AuthProvider.tsx` (503 lines)

**Complexity Factors:**

1. **Multiple state mechanisms:**

   - useReducer for flags
   - useState for user data
   - External Map for caching
   - External Set for deduplication
   - External Map for circuit breaker

2. **Multiple timeout layers:**

   - 3-second RPC timeout
   - 5-second session timeout
   - 10-second fallback timeout
   - 30-second circuit breaker timeout

3. **Retry mechanisms:**
   - Exponential backoff (1s, 2s, 4s)
   - Circuit breaker pattern
   - Request deduplication

**Code Example:**

```typescript
// Multiple state sources
const [flags, dispatch] = useReducer(...)
const [organization, setOrganization] = useState(...)
const pendingFetches = new Set<string>()  // Outside component!
const orgCache = new Map(...)              // Outside component!
const failedFetches = new Map(...)         // Outside component!

// Complex state machine
type AuthAction =
  | { type: 'CHECK_SESSION_START' }
  | { type: 'CHECK_SESSION_DONE_NO_SESSION' }
  | { type: 'CHECK_SESSION_DONE_WITH_SESSION' }
  | { type: 'ORG_FETCH_START' }
  | { type: 'ORG_FETCH_SUCCESS' }
  | { type: 'ORG_FETCH_FAILURE' }
  | { type: 'SIGN_OUT' }
```

#### Impact Assessment

- **Severity:** 🟠 High
- **User Impact:** Potential auth failures, session issues
- **Business Impact:** User frustration, support tickets
- **Security Impact:** Potential session management vulnerabilities
- **Performance Impact:** Cache/retry overhead

#### Proposed Solution

**Phase 1: Extract State Management (Week 1)**

```typescript
// Create new file: src/hooks/useAuthState.ts
export function useAuthState() {
  const [state, dispatch] = useReducer(authStateReducer, initialState)
  return { state, dispatch }
}

// Create new file: src/services/authCacheService.ts
export class AuthCacheService {
  private cache = new Map()
  private pendingRequests = new Set()
  private circuitBreaker = new Map()

  // Centralized cache management
  get(key: string) { ... }
  set(key: string, value: any) { ... }
  invalidate(key: string) { ... }
  isPending(key: string) { ... }
  isCircuitOpen(key: string) { ... }
}
```

**Phase 2: Simplify Retry Logic (Week 1-2)**

```typescript
// Create new file: src/services/authRetryService.ts
export class AuthRetryService {
  async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    // Unified retry logic
  }
}

// Simplified AuthProvider
const fetchOrganization = useCallback(async (userId: string) => {
  return authRetryService.withRetry(
    () => supabase.rpc('get_user_organizations'),
    { maxAttempts: 2, timeout: 3000 }
  );
}, []);
```

**Phase 3: Add Comprehensive Tests (Week 2)**

```typescript
// New file: src/providers/__tests__/AuthProvider.test.tsx
describe('AuthProvider', () => {
  it('handles initial session load');
  it('handles organization fetch failure gracefully');
  it('respects circuit breaker limits');
  it('clears cache on security events');
  it('handles concurrent requests correctly');
  it('times out appropriately');
});
```

**Phase 4: Add Monitoring (Week 2)**

```typescript
// Add to AuthProvider
useEffect(() => {
  if (authError) {
    // Log to error monitoring service
    logger.error('Auth error occurred', {
      error: authError,
      userId: user?.id,
      organizationId: organization?.id,
      timestamp: Date.now(),
    });
  }
}, [authError]);
```

#### Implementation Effort

- **Time:** 2 weeks (part-time)
- **Complexity:** High
- **Dependencies:** None (internal refactor)
- **Testing Required:** Extensive unit and integration tests
- **Risk:** High (touches critical authentication flow)

#### Migration Strategy

1. **Week 1:** Extract services, keep old code
2. **Week 1:** Add feature flag for new implementation
3. **Week 2:** Add comprehensive tests
4. **Week 2:** Enable feature flag for internal testing
5. **Week 3:** Monitor for issues
6. **Week 3:** Enable for all users
7. **Week 4:** Remove old code

#### Verification Steps

1. All existing tests pass
2. New tests achieve >90% coverage
3. No increase in auth errors in logs
4. Performance metrics stable or improved
5. Circuit breaker logs show proper functioning

---

### P1-2: Missing Rate Limiting on AI Endpoints

**Category:** Security / Cost Control  
**Severity:** High  
**Impact:** API abuse, potential cost overruns  
**Affected Systems:** All edge functions, especially ai-grant-writer

#### Root Cause

No rate limiting implemented on edge functions, allowing unlimited API calls to expensive AI services.

#### Evidence

**File:** `supabase/functions/ai-grant-writer/index.ts`

```typescript
// No rate limiting visible
serve(async (req) => {
  // Direct API call without rate checks
  const response = await callAIProvider(...)
})
```

#### Impact Assessment

- **Severity:** 🟠 High
- **User Impact:** Potential service degradation
- **Business Impact:** Uncontrolled costs, potential API quota exhaustion
- **Security Impact:** DDoS vulnerability
- **Performance Impact:** Service degradation under load

#### Proposed Solution

**Option 1: Upstash Redis Rate Limiting (Recommended)**

```typescript
// Install Upstash Redis client
// supabase/functions/_shared/rateLimiter.ts

import { Redis } from 'https://esm.sh/@upstash/redis@1.22.0';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_TOKEN')!,
});

export async function checkRateLimit(
  userId: string,
  endpoint: string,
  limits: { requests: number; window: number }
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `ratelimit:${endpoint}:${userId}`;
  const now = Date.now();
  const window = limits.window * 1000; // Convert to ms

  // Get current count
  const count = await redis.incr(key);

  if (count === 1) {
    // First request in window
    await redis.expire(key, limits.window);
  }

  const ttl = await redis.ttl(key);
  const resetAt = now + ttl * 1000;

  return {
    allowed: count <= limits.requests,
    remaining: Math.max(0, limits.requests - count),
    resetAt,
  };
}

// Usage in edge function
const rateLimit = await checkRateLimit(userId, 'ai-grant-writer', {
  requests: 10, // 10 requests
  window: 60, // per 60 seconds
});

if (!rateLimit.allowed) {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        'Retry-After': String(
          Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
        ),
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(rateLimit.resetAt),
      },
    }
  );
}
```

**Option 2: Supabase Edge Function Rate Limiting**

```sql
-- Create rate limiting table
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, endpoint, window_start)
);

-- Create rate limit check function
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_max_requests INTEGER,
  p_window_minutes INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_count INTEGER;
  v_allowed BOOLEAN;
BEGIN
  -- Clean old windows
  DELETE FROM rate_limits
  WHERE window_start < NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  -- Get or create current window count
  INSERT INTO rate_limits (user_id, endpoint, request_count)
  VALUES (p_user_id, p_endpoint, 1)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  v_allowed := v_count <= p_max_requests;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'count', v_count,
    'limit', p_max_requests,
    'remaining', GREATEST(0, p_max_requests - v_count)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

```typescript
// Usage in edge function
const { data: rateCheck } = await supabase.rpc('check_rate_limit', {
  p_user_id: user.id,
  p_endpoint: 'ai-grant-writer',
  p_max_requests: 10,
  p_window_minutes: 1,
});

if (!rateCheck.allowed) {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      limit: rateCheck.limit,
      remaining: rateCheck.remaining,
    }),
    { status: 429 }
  );
}
```

**Recommended Rate Limits:**

```typescript
const RATE_LIMITS = {
  'ai-grant-writer': {
    free: { requests: 5, window: 300 }, // 5 per 5 min
    pro: { requests: 20, window: 300 }, // 20 per 5 min
    enterprise: { requests: 100, window: 300 }, // 100 per 5 min
  },
  'foundation-scraper': {
    free: { requests: 10, window: 60 }, // 10 per minute
    pro: { requests: 50, window: 60 }, // 50 per minute
    enterprise: { requests: 200, window: 60 }, // 200 per minute
  },
  'generate-suggestions': {
    free: { requests: 20, window: 300 }, // 20 per 5 min
    pro: { requests: 100, window: 300 }, // 100 per 5 min
    enterprise: { requests: 500, window: 300 }, // 500 per 5 min
  },
};
```

#### Implementation Effort

- **Time:** 3-5 days
- **Complexity:** Medium
- **Dependencies:** Upstash Redis account OR database migration
- **Testing Required:** Load testing, rate limit verification
- **Cost:** Upstash Redis: $0-10/month for low volume

#### Implementation Steps

1. **Day 1: Set up infrastructure**

   - Create Upstash Redis account
   - Add credentials to Supabase secrets
   - Create shared rate limiter module

2. **Day 2: Implement rate limiting**

   - Add rate limit checks to all edge functions
   - Add proper error responses
   - Add rate limit headers

3. **Day 3: Add monitoring**

   - Log rate limit hits
   - Create alerts for excessive rate limit hits
   - Add dashboard metrics

4. **Day 4-5: Testing**
   - Unit tests for rate limiter
   - Integration tests for edge functions
   - Load testing to verify limits
   - Test different user tiers

#### Verification Steps

1. Make 11 requests in 60 seconds → should get 429 on 11th
2. Verify retry-after header is correct
3. Wait for window to reset → request should succeed
4. Verify different users have independent limits
5. Check logs show rate limit events

---

### P1-3: Hardcoded AI Model Lists

**Category:** Maintainability / Scalability  
**Severity:** High  
**Impact:** Difficult to update models, becomes stale quickly  
**Affected Systems:** AI generation, model selection

#### Root Cause

AI model lists are hardcoded in multiple locations, making updates difficult and error-prone.

#### Evidence

**File:** `supabase/functions/ai-grant-writer/index.ts:15-25`

```typescript
const VALID_OPENAI_MODELS = [
  'gpt-5-2025-08-07',
  'gpt-5-mini-2025-08-07',
  'gpt-5-nano-2025-08-07',
  'gpt-4.1-2025-04-14',
  'gpt-4.1-mini-2025-04-14',
  'gpt-4o-mini',
  'gpt-4o',
  'o3-2025-04-16',
  'o4-mini-2025-04-16',
];
```

**File:** `src/services/aiProviderService.ts:59`

```typescript
models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
```

**Issues:**

- Models differ between frontend and backend
- No single source of truth
- Manual updates required in multiple places
- Model deprecation not tracked
- New models require code changes

#### Impact Assessment

- **Severity:** 🟠 High
- **User Impact:** Missing newer/better models
- **Business Impact:** Maintenance burden, potential errors
- **Security Impact:** Low
- **Performance Impact:** None

#### Proposed Solution

**Create Centralized Model Configuration**

```sql
-- Migration: Create ai_models table
CREATE TABLE ai_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,  -- 'openai', 'anthropic', etc.
  model_id TEXT NOT NULL,  -- 'gpt-4o', 'claude-3-5-sonnet', etc.
  name TEXT NOT NULL,      -- Display name
  description TEXT,
  max_tokens INTEGER,
  cost_per_1k_input DECIMAL,
  cost_per_1k_output DECIMAL,
  capabilities TEXT[],     -- ['chat', 'vision', 'function-calling']
  is_active BOOLEAN DEFAULT true,
  is_deprecated BOOLEAN DEFAULT false,
  deprecated_at TIMESTAMP,
  replacement_model_id TEXT,
  requires_new_token_format BOOLEAN DEFAULT false,
  supports_temperature BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider, model_id)
);

-- Insert current models
INSERT INTO ai_models (provider, model_id, name, max_tokens, capabilities, requires_new_token_format) VALUES
-- OpenAI
('openai', 'gpt-4o', 'GPT-4o', 128000, ARRAY['chat', 'vision'], false),
('openai', 'gpt-4o-mini', 'GPT-4o Mini', 128000, ARRAY['chat'], false),
('openai', 'gpt-5-2025-08-07', 'GPT-5', 200000, ARRAY['chat', 'vision'], true),
('openai', 'gpt-5-mini-2025-08-07', 'GPT-5 Mini', 200000, ARRAY['chat'], true),
-- Anthropic
('anthropic', 'claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 200000, ARRAY['chat'], false),
('anthropic', 'claude-3-5-haiku-20241022', 'Claude 3.5 Haiku', 200000, ARRAY['chat'], false),
-- Google
('google', 'gemini-1.5-pro', 'Gemini 1.5 Pro', 1000000, ARRAY['chat', 'vision'], false),
('google', 'gemini-1.5-flash', 'Gemini 1.5 Flash', 1000000, ARRAY['chat'], false);

-- Function to get active models
CREATE OR REPLACE FUNCTION get_active_models(p_provider TEXT DEFAULT NULL)
RETURNS TABLE (
  model_id TEXT,
  name TEXT,
  provider TEXT,
  max_tokens INTEGER,
  capabilities TEXT[],
  requires_new_token_format BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.model_id,
    m.name,
    m.provider,
    m.max_tokens,
    m.capabilities,
    m.requires_new_token_format
  FROM ai_models m
  WHERE m.is_active = true
    AND m.is_deprecated = false
    AND (p_provider IS NULL OR m.provider = p_provider)
  ORDER BY m.provider, m.name;
END;
$$ LANGUAGE plpgsql;
```

**Update Edge Function:**

```typescript
// supabase/functions/ai-grant-writer/index.ts

// Remove hardcoded list
// const VALID_OPENAI_MODELS = [...]  ❌ DELETE THIS

// Add model cache
let modelCache: Map<string, any> = new Map();
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getValidModels(supabase: any, provider: string) {
  const now = Date.now();
  const cacheKey = `models:${provider}`;

  // Check cache
  if (modelCache.has(cacheKey) && now - lastCacheUpdate < CACHE_TTL) {
    return modelCache.get(cacheKey);
  }

  // Fetch from database
  const { data, error } = await supabase.rpc('get_active_models', {
    p_provider: provider,
  });

  if (error) {
    console.error('Failed to fetch models:', error);
    // Fallback to basic list
    return provider === 'openai' ? ['gpt-4o-mini'] : [];
  }

  const models = data.map((m: any) => m.model_id);
  modelCache.set(cacheKey, models);
  lastCacheUpdate = now;

  return models;
}

// Update validation function
async function validateModel(
  model: string,
  provider: string,
  supabase: any
): Promise<string> {
  const validModels = await getValidModels(supabase, provider);

  if (!validModels.includes(model)) {
    console.error(`Invalid model: ${model} for provider: ${provider}`);
    console.log(`Valid models: ${validModels.join(', ')}`);
    // Return default model for provider
    return validModels[0] || 'gpt-4o-mini';
  }

  return model;
}
```

**Update Frontend Service:**

```typescript
// src/services/aiProviderService.ts

export class AIProviderService {
  private async fetchModelsFromDB(providerId: string): Promise<ModelConfig[]> {
    const { data, error } = await supabase.rpc('get_active_models', {
      p_provider: providerId
    })

    if (error) {
      console.error('Failed to fetch models:', error)
      return this.getFallbackModels(providerId)
    }

    return data.map(m => ({
      id: m.model_id,
      name: m.name,
      provider: m.provider,
      maxTokens: m.max_tokens,
      capabilities: m.capabilities
    }))
  }

  private getFallbackModels(providerId: string): ModelConfig[] {
    // Minimal fallback list
    const fallbacks = {
      openai: [{ id: 'gpt-4o-mini', name: 'GPT-4o Mini', ... }],
      anthropic: [{ id: 'claude-3-5-haiku-20241022', ... }],
      // ...
    }
    return fallbacks[providerId] || []
  }
}
```

**Admin UI for Model Management:**

```tsx
// New component: src/components/admin/ModelManagement.tsx
export function ModelManagement() {
  const [models, setModels] = useState([]);

  async function addModel(modelData) {
    await supabase.from('ai_models').insert(modelData);
    // Refresh list
  }

  async function deprecateModel(modelId: string, replacementId: string) {
    await supabase
      .from('ai_models')
      .update({
        is_deprecated: true,
        deprecated_at: new Date().toISOString(),
        replacement_model_id: replacementId,
      })
      .eq('id', modelId);
  }

  return <div>{/* Model list with add/edit/deprecate actions */}</div>;
}
```

#### Implementation Effort

- **Time:** 4-5 days
- **Complexity:** Medium
- **Dependencies:** Database migration
- **Testing Required:** Model validation, fallback testing
- **Risk:** Medium (affects core AI functionality)

#### Implementation Steps

1. **Day 1: Database setup**

   - Create migration
   - Populate initial data
   - Test RPC function

2. **Day 2: Backend integration**

   - Update edge function
   - Add caching
   - Add fallback logic
   - Test model validation

3. **Day 3: Frontend integration**

   - Update AIProviderService
   - Add model fetching
   - Update UI components

4. **Day 4: Admin UI**

   - Create model management page
   - Add CRUD operations
   - Add deprecation workflow

5. **Day 5: Testing & Documentation**
   - End-to-end testing
   - Document model addition process
   - Create migration guide

#### Verification Steps

1. Add new model via admin UI
2. Verify model appears in edge function
3. Verify model appears in frontend
4. Deprecate model → verify automatic fallback
5. Test with cache expiry
6. Test fallback on database error

---

### P1-4: Multiple Route Guard Implementations

**Category:** Code Quality / Security  
**Severity:** High  
**Impact:** Inconsistent protection, maintenance burden  
**Affected Systems:** Routing, authentication

#### Root Cause

Four different route guard implementations with overlapping functionality.

#### Evidence

**File:** `src/components/AppRouter.tsx`

```tsx
// Guard #1: ProtectedRoute
<Route path="/accept-invitation" element={
  <ProtectedRoute>
    <AcceptInvitation />
  </ProtectedRoute>
} />

// Guard #2: UnifiedRouteGuard
<Route path="/dashboard" element={
  <UnifiedRouteGuard requireAuth={true} requireOnboarding={true}>
    <Dashboard />
  </UnifiedRouteGuard>
} />

// Guard #3: SuperAdminGuard (imported but unused?)
import { SuperAdminGuard } from './auth/SuperAdminGuard';

// Guard #4: SuperAdminRouteGuard
<Route path="/superadmin" element={
  <SuperAdminRouteGuard>
    <SuperAdmin />
  </SuperAdminRouteGuard>
} />
```

**Issues:**

- Redundant implementations
- Inconsistent behavior
- Difficult to maintain
- Potential security gaps
- Unused imports

#### Impact Assessment

- **Severity:** 🟠 High
- **User Impact:** Inconsistent auth experience
- **Business Impact:** Maintenance burden
- **Security Impact:** Potential bypass vulnerabilities
- **Performance Impact:** Minimal

#### Proposed Solution

**Create Single Unified Route Guard**

```tsx
// src/components/auth/RouteGuard.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';

export interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireOnboarding?: boolean;
  requireSuperAdmin?: boolean;
  requireRole?: 'owner' | 'admin' | 'member' | 'viewer';
  requireOrganization?: boolean;
  redirectTo?: string;
}

export function RouteGuard({
  children,
  requireAuth = true,
  requireOnboarding = false,
  requireSuperAdmin = false,
  requireRole,
  requireOrganization = false,
  redirectTo,
}: RouteGuardProps) {
  const {
    user,
    loading,
    authChecked,
    organization,
    needsOnboarding,
    hasOrganization,
    userRole,
  } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (loading || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Check authentication
  if (requireAuth && !user) {
    return (
      <Navigate
        to={redirectTo || '/login'}
        state={{ from: location }}
        replace
      />
    );
  }

  // Check onboarding
  if (requireAuth && requireOnboarding && needsOnboarding) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  // Check organization membership
  if (requireOrganization && !hasOrganization) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  // Check superadmin
  if (requireSuperAdmin) {
    const isSuperAdmin = userRole?.role === 'superadmin';
    if (!isSuperAdmin) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Check role
  if (requireRole) {
    const roleHierarchy = {
      owner: 4,
      admin: 3,
      member: 2,
      viewer: 1,
    };

    const userRoleLevel =
      roleHierarchy[userRole?.role as keyof typeof roleHierarchy] || 0;
    const requiredRoleLevel = roleHierarchy[requireRole];

    if (userRoleLevel < requiredRoleLevel) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}

// Convenience aliases for common patterns
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return <RouteGuard requireAuth={true}>{children}</RouteGuard>;
}

export function AuthenticatedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard requireAuth={true} requireOnboarding={true}>
      {children}
    </RouteGuard>
  );
}

export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard
      requireAuth={true}
      requireOnboarding={true}
      requireSuperAdmin={true}
    >
      {children}
    </RouteGuard>
  );
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard requireAuth={true} requireOnboarding={true} requireRole="admin">
      {children}
    </RouteGuard>
  );
}
```

**Update AppRouter:**

```tsx
// src/components/AppRouter.tsx
import {
  RouteGuard,
  ProtectedRoute,
  AuthenticatedRoute,
  SuperAdminRoute,
} from '@/components/auth/RouteGuard';

export default function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />

      {/* Protected but no onboarding required */}
      <Route
        path="/accept-invitation"
        element={
          <ProtectedRoute>
            <AcceptInvitation />
          </ProtectedRoute>
        }
      />

      <Route
        path="/onboarding"
        element={
          <RouteGuard requireAuth={true} requireOnboarding={false}>
            <Onboarding />
          </RouteGuard>
        }
      />

      {/* Authenticated routes (auth + onboarding) */}
      <Route
        path="/dashboard"
        element={
          <AuthenticatedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </AuthenticatedRoute>
        }
      />

      {/* SuperAdmin routes */}
      <Route
        path="/superadmin"
        element={
          <SuperAdminRoute>
            <AppLayout>
              <SuperAdmin />
            </AppLayout>
          </SuperAdminRoute>
        }
      />

      {/* Admin-only routes */}
      <Route
        path="/settings/team"
        element={
          <AdminRoute>
            <AppLayout>
              <TeamSettings />
            </AppLayout>
          </AdminRoute>
        }
      />
    </Routes>
  );
}
```

#### Implementation Effort

- **Time:** 2-3 days
- **Complexity:** Medium
- **Dependencies:** None
- **Testing Required:** Extensive route testing
- **Risk:** High (affects all routes)

#### Migration Strategy

1. **Day 1: Create new RouteGuard**

   - Implement new component
   - Add comprehensive tests
   - Document usage

2. **Day 2: Migrate routes gradually**

   - Start with low-risk routes
   - Test each migration
   - Monitor for issues

3. **Day 3: Complete migration**

   - Migrate remaining routes
   - Remove old guards
   - Clean up imports

4. **Testing:**
   - Test all route combinations
   - Test auth flows
   - Test role-based access
   - Test onboarding flows

#### Verification Steps

1. Test all routes as unauthenticated user
2. Test all routes as authenticated but not onboarded
3. Test all routes as normal user
4. Test all routes as admin
5. Test all routes as superadmin
6. Verify redirects work correctly
7. Verify loading states display
8. Verify no auth loops

---

## 🟡 MEDIUM PRIORITY ISSUES (P2)

### P2-1: Large Edge Function Files

**Severity:** Medium  
**File:** `supabase/functions/ai-grant-writer/index.ts` (929 lines)

#### Proposed Solution

Split into modules:

- `handlers/generateSection.ts`
- `handlers/generateFullDraft.ts`
- `providers/openai.ts`
- `providers/anthropic.ts`
- `utils/validation.ts`
- `utils/retry.ts`

### P2-2: UUID Migration Naming

**Severity:** Medium  
**Impact:** Difficult to understand migration history

#### Proposed Solution

Rename migrations with descriptive names:

```bash
# Bad
20250808115323_29e679a1-e94a-4486-82ee-8bfeafe64c61.sql

# Good
20250808115323_add_user_roles_table.sql
```

### P2-3: Redundant Test Files

**Severity:** Medium  
**Files:** Multiple test files with similar names

#### Proposed Solution

Consolidate:

- `06-ai-generation-suite.cy.ts` + `06-comprehensive-functionality.cy.ts` → Single file
- `test-hero-display.cy.ts` + `test-hero-display-final.cy.ts` → Keep final version
- `test-metadata-validation-simple.cy.ts` + `test-database-metadata-validation.cy.ts` → Merge

### P2-4: Missing Error Monitoring

**Severity:** Medium

#### Proposed Solution

Integrate Sentry:

```typescript
// src/main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [new Sentry.BrowserTracing(), new Sentry.Replay()],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### P2-5: No API Key Rotation

**Severity:** Medium

#### Proposed Solution

Create key rotation process:

1. Store API keys with version numbers
2. Support multiple active keys
3. Automatic fallback to secondary key
4. Scheduled rotation reminders

---

## 🟢 LOW PRIORITY ISSUES (P3)

### P3-1: Console Logging in Production

**Solution:** Use conditional logging

```typescript
const logger = {
  log: import.meta.env.MODE === 'development' ? console.log : () => {},
  error: console.error, // Always log errors
};
```

### P3-2: Backup Files in Repository

**Solution:** Remove backup files

```bash
git rm src/pages/*.backup
git rm cypress.config.cjs.backup
git rm cypress.config.cjs.new
```

### P3-3: Multiple Cypress Configs

**Solution:** Keep only active config

```bash
git rm cypress.config.cjs.backup
git rm cypress.config.cjs.new
```

---

## 📅 IMPLEMENTATION ROADMAP

### Week 1: Critical Issues

- **Day 1-2:** Configure Supabase Service Role Key (P0-1)
- **Day 2-3:** Fix test execution environment (P0-2)
- **Day 3-5:** Implement rate limiting (P1-2)

### Week 2: High Priority Issues

- **Day 1-3:** Refactor AuthProvider Phase 1 (P1-1)
- **Day 4-5:** Centralize AI model configuration (P1-3)

### Week 3: High Priority Completion

- **Day 1-3:** Consolidate route guards (P1-4)
- **Day 4-5:** AuthProvider testing and monitoring (P1-1)

### Week 4: Medium Priority Issues

- **Day 1-2:** Modularize edge functions (P2-1)
- **Day 2-3:** Set up error monitoring (P2-4)
- **Day 4:** Rename migrations (P2-2)
- **Day 5:** Consolidate tests (P2-3)

### Week 5: Polish & Testing

- **Day 1-2:** Remove backup files (P3-2, P3-3)
- **Day 2-3:** Add conditional logging (P3-1)
- **Day 4-5:** Comprehensive testing of all fixes

### Week 6: Documentation & Launch Prep

- **Day 1-2:** Update all documentation
- **Day 3-4:** Security audit
- **Day 5:** Final validation

---

## 🧪 TESTING STRATEGY

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Coverage requirements
- Critical functions: >90%
- Services: >80%
- Components: >70%
```

### Integration Tests

```bash
# Test auth flows
npm run test:e2e:core

# Test AI generation
npm run test:e2e:ai

# Test application workflows
npm run test:e2e:applications
```

### Load Testing

```bash
# Test rate limiting
# Test concurrent users
# Test AI endpoint throughput
```

### Security Testing

- RLS policy validation
- Auth bypass attempts
- Rate limit verification
- API key security

---

## 📊 SUCCESS METRICS

### Code Quality

- ✅ TypeScript errors: 0
- ✅ Linter warnings: < 10
- ✅ Test coverage: > 80%
- ✅ Bundle size: < 500KB (gzipped)

### Performance

- ✅ Initial load: < 2s
- ✅ Time to interactive: < 3s
- ✅ AI generation: < 15s
- ✅ API response: < 200ms

### Security

- ✅ All RLS policies active
- ✅ Rate limiting on all endpoints
- ✅ No exposed secrets
- ✅ Security audit passed

### Reliability

- ✅ Test pass rate: > 95%
- ✅ Error rate: < 1%
- ✅ Uptime: > 99.9%

---

_End of Issue Registry & Mitigation Roadmap_
