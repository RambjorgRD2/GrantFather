import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useReducer,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/utils/logger';
import { trackAsyncOperation } from '@/services/performanceService';

type Organization = Database['public']['Tables']['organizations']['Row'];
type UserRole = Database['public']['Tables']['user_roles']['Row'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authChecked: boolean;
  organization: Organization | null;
  userRole: UserRole | null;
  needsOnboarding: boolean;
  hasOrganization: boolean;
  orgLoading: boolean;
  authError: Error | null;
  signOut: () => Promise<void>;
  refetchOrganization: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

// PHASE 3: Add LRU cache management to prevent memory leaks
const MAX_CACHE_SIZE = 100; // Maximum cached organizations
const pendingFetches = new Set<string>();
const orgCache = new Map<string, { org: any; role: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const failedFetches = new Map<string, number>(); // Circuit breaker
const CIRCUIT_BREAKER_TIMEOUT = 10000; // 10 seconds - reduced for better UX
const CACHE_VERSION = '1.0.0'; // Increment to invalidate all caches

// Export cache clearing function for manual use
export const clearAuthCache = () => {
  orgCache.clear();
  failedFetches.clear();
  try {
    // Clear localStorage auth-related data
    const keys = ['org_cache_', 'failed_fetch_', 'last_org_fetch_failure'];
    Object.keys(localStorage).forEach(key => {
      if (keys.some(prefix => key.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    });
    localStorage.setItem('cache_version', CACHE_VERSION);
    console.log('✅ Auth cache cleared successfully');
  } catch (e) {
    console.warn('Failed to clear localStorage cache:', e);
  }
};

// LRU cache management: remove oldest entry when size limit reached
function addToOrgCache(key: string, value: { org: any; role: any; timestamp: number }) {
  if (orgCache.size >= MAX_CACHE_SIZE) {
    // Remove the oldest entry (first key in Map maintains insertion order)
    const oldestKey = orgCache.keys().next().value;
    if (oldestKey) {
      orgCache.delete(oldestKey);
      console.log(`[AuthProvider] Cache evicted oldest entry: ${oldestKey}`);
    }
  }
  orgCache.set(key, value);
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // Auth state machine
  type AuthAction =
    | { type: 'CHECK_SESSION_START' }
    | { type: 'CHECK_SESSION_DONE_NO_SESSION' }
    | { type: 'CHECK_SESSION_DONE_WITH_SESSION' }
    | { type: 'ORG_FETCH_START' }
    | { type: 'ORG_FETCH_SUCCESS' }
    | { type: 'ORG_FETCH_FAILURE' }
    | { type: 'SIGN_OUT' };

  interface AuthFlagsState {
    loading: boolean;
    authChecked: boolean;
    orgLoading: boolean;
  }

  // State validation function
  const validateState = (state: AuthFlagsState): AuthFlagsState => {
    // Invalid state: loading=true, authChecked=true, orgLoading=false
    if (state.loading && state.authChecked && !state.orgLoading) {
      console.warn(
        'Invalid state detected: loading=true, authChecked=true, orgLoading=false. Auto-correcting...'
      );
      return { ...state, loading: false };
    }

    // Invalid state: orgLoading=true but loading=false
    if (state.orgLoading && !state.loading) {
      console.warn(
        'Invalid state detected: orgLoading=true, loading=false. Auto-correcting...'
      );
      return { ...state, loading: true };
    }

    return state;
  };

  const [flags, dispatch] = useReducer(
    (state: AuthFlagsState, action: AuthAction): AuthFlagsState => {
      let newState: AuthFlagsState;

      switch (action.type) {
        case 'CHECK_SESSION_START':
          newState = { ...state, loading: true, authChecked: false };
          break;
        case 'CHECK_SESSION_DONE_NO_SESSION':
          newState = { ...state, loading: false, authChecked: true };
          break;
        case 'CHECK_SESSION_DONE_WITH_SESSION':
          newState = { ...state, loading: true, authChecked: true }; // still loading while we fetch org
          break;
        case 'ORG_FETCH_START':
          newState = { ...state, orgLoading: true, loading: true };
          break;
        case 'ORG_FETCH_SUCCESS':
          newState = { ...state, orgLoading: false, loading: false };
          break;
        case 'ORG_FETCH_FAILURE':
          newState = { ...state, orgLoading: false, loading: false };
          break;
        case 'SIGN_OUT':
          newState = { loading: false, authChecked: true, orgLoading: false };
          break;
        default:
          newState = state;
      }

      // Validate and auto-correct invalid states
      return validateState(newState);
    },
    { loading: true, authChecked: false, orgLoading: false }
  );

  const loading = flags.loading;
  const authChecked = flags.authChecked;
  const orgLoading = flags.orgLoading;

  // Debug logging removed for production
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [hasOrganization, setHasOrganization] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [authError, setAuthError] = useState<Error | null>(null);

  // Check cache version on mount and clear if mismatch
  useEffect(() => {
    const storedVersion = localStorage.getItem('cache_version');
    if (storedVersion !== CACHE_VERSION) {
      console.log('🔄 Cache version mismatch - clearing all caches');
      clearAuthCache();
    }
  }, []);

  // Enhanced fetchOrganization with retry logic, timeout, deduplication, and caching
  const fetchOrganization = useCallback(
    async (userId: string) => {
      // PHASE 4: Check cache first
      const cachedData = orgCache.get(userId);
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
        console.log('✅ Using cached organization data');
        setUserRole(cachedData.role);
        setOrganization(cachedData.org);
        setHasOrganization(!!cachedData.org);
        setNeedsOnboarding(!cachedData.org?.onboarding_completed);
        dispatch({ type: 'ORG_FETCH_SUCCESS' });
        return;
      }
      
      // PHASE 4: Circuit breaker - check if recent failure
      const lastFailure = failedFetches.get(userId);
      if (lastFailure && Date.now() - lastFailure < CIRCUIT_BREAKER_TIMEOUT) {
        const timeRemaining = Math.ceil((CIRCUIT_BREAKER_TIMEOUT - (Date.now() - lastFailure)) / 1000);
        console.log(`⚠️ Circuit breaker active - ${timeRemaining}s remaining. Clearing cache may help.`);
        // Don't block completely - set sensible defaults
        setUserRole(null);
        setOrganization(null);
        setHasOrganization(false);
        setNeedsOnboarding(false); // Don't force onboarding during circuit breaker
        dispatch({ type: 'ORG_FETCH_SUCCESS' });
        return;
      }
      
      // Check if already loading or if fetch is already pending for this user
      if (orgLoading || pendingFetches.has(userId)) {
        console.log(
          '🔍 DEBUG: fetchOrganization called but orgLoading is true or fetch already pending, skipping'
        );
        return; // Prevent overlapping fetches
      }

      // Mark this fetch as pending
      pendingFetches.add(userId);

      try {
        dispatch({ type: 'ORG_FETCH_START' });
        console.log('🔍 DEBUG: fetchOrganization called for user:', userId);
        logger.auth(`Fetching organization data for user: ${userId}`);

        // PHASE 4: Reduce retries from 3 to 1 for faster failure
        const fetchWithRetry = async (retries = 1): Promise<any> => {
          return trackAsyncOperation('fetchOrganization', async () => {
            for (let i = 0; i < retries; i++) {
              try {
                console.log(`🔍 DEBUG: RPC attempt ${i + 1}/${retries}`);

                // PHASE 1: Reduce timeout from 10s to 3s to minimize freeze
                const timeoutPromise = new Promise((_, reject) => {
                  setTimeout(
                    () => reject(new Error('RPC timeout after 3 seconds')),
                    3000
                  );
                });

                const rpcPromise = supabase.rpc('get_user_organizations');
                const { data: rpcData, error: rpcError } = (await Promise.race([
                  rpcPromise,
                  timeoutPromise,
                ])) as any;

                if (rpcError) {
                  throw rpcError;
                }

                return rpcData;
              } catch (error) {
                console.log(`🔍 DEBUG: RPC attempt ${i + 1} failed:`, error);

                if (i === retries - 1) {
                  throw error; // Last attempt failed
                }

                // Exponential backoff: 1s, 2s, 4s
                const delay = Math.pow(2, i) * 1000;
                console.log(`🔍 DEBUG: Waiting ${delay}ms before retry...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
              }
            }
          });
        };

        const rpcData = await fetchWithRetry();
        console.log('🔍 DEBUG: RPC result:', {
          count: rpcData?.length || 0,
        });

        if (!rpcData || rpcData.length === 0) {
          // No user role found - normal for new users
          logger.auth('No user roles found - user needs onboarding');
          console.log('🔍 DEBUG: No roles found for user:', userId);
          setUserRole(null);
          setOrganization(null);
          setHasOrganization(false);
          setNeedsOnboarding(true);
          dispatch({ type: 'ORG_FETCH_SUCCESS' });
          return;
        }

        // Validate RPC response structure
        if (!Array.isArray(rpcData)) {
          console.error('🔍 DEBUG: Invalid RPC response format:', rpcData);
          throw new Error('Invalid organization data format');
        }

        console.log('🔍 DEBUG: Found orgs for user via RPC:', rpcData);

        // Use the first organization for initial context (can enhance with last-active later)
        const first = rpcData[0];
        const roleData = {
          organization_id: first.organization_id,
          role: first.role,
        } as any;

        if (!roleData) {
          // No user role found - normal for new users
          logger.auth('No user role found - user needs onboarding');
          setUserRole(null);
          setOrganization(null);
          setHasOrganization(false);
          setNeedsOnboarding(true);
          return;
        }

        logger.auth('User role found:', roleData);
        setUserRole(roleData);

        // Get the organization details
        console.log(
          '🔍 DEBUG: Querying organizations for organization_id (post-RPC):',
          roleData.organization_id
        );
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', roleData.organization_id)
          .maybeSingle();

        console.log('🔍 DEBUG: organizations query result:', {
          orgData,
          orgError,
        });

        if (orgError) {
          console.error('Organization fetch error:', orgError);
          setAuthError(orgError as Error);
          setOrganization(null);
          setHasOrganization(false);
          setNeedsOnboarding(true);
          return;
        }

        if (!orgData) {
          console.error('Organization not found for role:', roleData);
          setOrganization(null);
          setHasOrganization(false);
          setNeedsOnboarding(true);
          return;
        }

        logger.auth('Organization found:', orgData);
        console.log(
          '🔍 DEBUG: Setting hasOrganization to true, needsOnboarding to:',
          !orgData.onboarding_completed
        );
        setOrganization(orgData);
        setHasOrganization(true);
        setNeedsOnboarding(!orgData.onboarding_completed);
        
        // PHASE 3: Cache successful fetch with LRU management
        addToOrgCache(userId, { 
          org: orgData, 
          role: roleData, 
          timestamp: Date.now() 
        });
        failedFetches.delete(userId); // Clear circuit breaker on success
        
        dispatch({ type: 'ORG_FETCH_SUCCESS' });
      } catch (error) {
        console.error('Unexpected error in fetchOrganization:', error);

        // PHASE 4: Set circuit breaker on failure
        failedFetches.set(userId, Date.now());

        // Enhanced error handling
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        const isTimeoutError = errorMessage.includes('timeout');
        const isNetworkError =
          errorMessage.includes('fetch') || errorMessage.includes('network');

        if (isTimeoutError) {
          console.warn(
            '🔍 DEBUG: Organization fetch timeout - clearing cache for fresh retry'
          );
          // Clear cache to force fresh fetch next time
          orgCache.delete(userId);
          setUserRole(null);
          setOrganization(null);
          setHasOrganization(false);
          setNeedsOnboarding(false); // Don't force onboarding on timeout
          dispatch({ type: 'ORG_FETCH_SUCCESS' });
        } else if (isNetworkError) {
          console.error('🔍 DEBUG: Network error during organization fetch');
          setAuthError(
            new Error('Network error. Please check your connection.')
          );
          setUserRole(null);
          setOrganization(null);
          setHasOrganization(false);
          setNeedsOnboarding(false); // Don't force onboarding on network error
          dispatch({ type: 'ORG_FETCH_FAILURE' });
        } else {
          setAuthError(error as Error);
          setUserRole(null);
          setOrganization(null);
          setHasOrganization(false);
          setNeedsOnboarding(false); // Don't force onboarding on generic errors
          dispatch({ type: 'ORG_FETCH_FAILURE' });
        }
      } finally {
        // Always remove from pending fetches
        pendingFetches.delete(userId);
      }
    },
    [orgLoading]
  );

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.auth('Auth state change:', event, session?.user?.id);

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // User is authenticated - fetch organization data
        logger.auth('User authenticated, fetching organization data');
        dispatch({ type: 'CHECK_SESSION_DONE_WITH_SESSION' });
        await fetchOrganization(session.user.id);
      } else {
        // User is not authenticated
        logger.auth('User not authenticated, clearing organization data');
        setUserRole(null);
        setOrganization(null);
        setHasOrganization(false);
        setNeedsOnboarding(false);
        dispatch({ type: 'CHECK_SESSION_DONE_NO_SESSION' });
      }
    });

    // Get initial session with timeout
    const getInitialSession = async () => {
      // Add timeout to prevent hanging (reduced to 5 seconds for faster fallback)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session check timeout')), 5000);
      });

      try {
        dispatch({ type: 'CHECK_SESSION_START' });
        const sessionPromise = supabase.auth.getSession();
        const {
          data: { session },
          error,
        } = (await Promise.race([sessionPromise, timeoutPromise])) as any;

        if (error) {
          console.error('Session error:', error);
          dispatch({ type: 'CHECK_SESSION_DONE_NO_SESSION' });
          return;
        }

        logger.auth(
          session ? 'Existing session found' : 'No existing session found'
        );

        setSession(session);
        setUser(session?.user ?? null);

        if (!session?.user) {
          // No session found, setting loading to false
          dispatch({ type: 'CHECK_SESSION_DONE_NO_SESSION' });
        } else {
          // Handle the case where a valid session exists on load but no auth state change fires
          dispatch({ type: 'CHECK_SESSION_DONE_WITH_SESSION' });
          try {
            await fetchOrganization(session.user.id);
          } finally {
            // Final flags are set by ORG_FETCH_* actions
          }
        }
      } catch (error) {
        // Only log non-timeout errors to reduce noise
        if (!error.message?.includes('timeout')) {
          console.error('Failed to get initial session:', error);
        }
        dispatch({ type: 'CHECK_SESSION_DONE_NO_SESSION' });
      }
    };

    getInitialSession();

    // Fallback timeout to prevent infinite loading (reduced to 10 seconds)
    const fallbackTimeout = setTimeout(() => {
      // Ensure UI is not stuck; do not override if already resolved by machine
      // We conservatively mark auth as checked and not loading
      // Org fetch reducer will have set appropriate flags if running
      // This helps avoid infinite spinners if Supabase event never fires
      // Using dispatch keeps a single source of truth
      dispatch({ type: 'CHECK_SESSION_DONE_NO_SESSION' });
    }, 10000); // 10 second fallback

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimeout);
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Clear state
      setUser(null);
      setSession(null);
      setOrganization(null);
      setUserRole(null);
      setHasOrganization(false);
      setNeedsOnboarding(false);
      dispatch({ type: 'SIGN_OUT' });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refetchOrganization = useCallback(async () => {
    if (user?.id) {
      setAuthError(null);
      await fetchOrganization(user.id);
    }
  }, [user?.id, fetchOrganization]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const value: AuthContextType = {
    user,
    session,
    loading,
    authChecked,
    organization,
    userRole,
    needsOnboarding,
    hasOrganization,
    orgLoading,
    authError,
    signOut,
    refetchOrganization,
    clearAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
