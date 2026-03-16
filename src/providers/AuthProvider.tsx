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

const pendingFetches = new Set<string>();
const orgCache = new Map<string, { org: any; role: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const failedFetches = new Map<string, number>(); // Circuit breaker
const CIRCUIT_BREAKER_TIMEOUT = 10000; // 10 seconds
const CACHE_VERSION = '1.1.0'; // Increment to invalidate all caches
const SESSION_CACHE_KEY = (uid: string) => `gf_org_${CACHE_VERSION}_${uid}`;

// sessionStorage helpers — survives page refresh, cleared on tab close
function readSessionCache(userId: string) {
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      sessionStorage.removeItem(SESSION_CACHE_KEY(userId));
      return null;
    }
    return parsed as { org: any; role: any; timestamp: number };
  } catch { return null; }
}

function writeSessionCache(userId: string, value: { org: any; role: any; timestamp: number }) {
  try {
    sessionStorage.setItem(SESSION_CACHE_KEY(userId), JSON.stringify(value));
  } catch { /* sessionStorage unavailable */ }
}

function clearSessionCache(userId?: string) {
  try {
    if (userId) {
      sessionStorage.removeItem(SESSION_CACHE_KEY(userId));
    } else {
      Object.keys(sessionStorage)
        .filter(k => k.startsWith('gf_org_'))
        .forEach(k => sessionStorage.removeItem(k));
    }
  } catch { /* sessionStorage unavailable */ }
}

// Export cache clearing function for manual use
export const clearAuthCache = () => {
  orgCache.clear();
  failedFetches.clear();
  clearSessionCache();
  try {
    localStorage.setItem('cache_version', CACHE_VERSION);
    logger.debug('Auth cache cleared');
  } catch { /* localStorage unavailable */ }
};

function addToOrgCache(key: string, value: { org: any; role: any; timestamp: number }) {
  orgCache.set(key, value);
  writeSessionCache(key, value);
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
    // Note: { loading: true, authChecked: true, orgLoading: false } is a valid
    // intermediate state (session found, org fetch not yet started) — do not correct it.

    // Invalid state: orgLoading=true but loading=false
    if (state.orgLoading && !state.loading) {
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
      logger.debug('Cache version mismatch - clearing all caches');
      clearAuthCache();
    }
  }, []);

  // Enhanced fetchOrganization with retry logic, timeout, deduplication, and caching
  const fetchOrganization = useCallback(
    async (userId: string) => {
      // Check in-memory cache first, then sessionStorage (survives page refresh)
      const cachedData = orgCache.get(userId) ?? readSessionCache(userId);
      if (cachedData) {
        // Warm the in-memory cache in case it was a sessionStorage hit
        orgCache.set(userId, cachedData);
        logger.debug('Using cached organization data');
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
        logger.warn(`Circuit breaker active - ${timeRemaining}s remaining`);
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
        return; // Prevent overlapping fetches
      }

      // Mark this fetch as pending
      pendingFetches.add(userId);

      try {
        dispatch({ type: 'ORG_FETCH_START' });
        logger.auth(`Fetching organization data for user: ${userId}`);

        // PHASE 4: Reduce retries from 3 to 1 for faster failure
        const fetchWithRetry = async (retries = 1): Promise<any> => {
          return trackAsyncOperation('fetchOrganization', async () => {
            for (let i = 0; i < retries; i++) {
              try {
                logger.debug(`RPC attempt ${i + 1}/${retries}`);

                const timeoutPromise = new Promise((_, reject) => {
                  setTimeout(
                    () => reject(new Error('RPC timeout after 10 seconds')),
                    10000
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
                logger.warn(`RPC attempt ${i + 1} failed:`, error);

                if (i === retries - 1) {
                  throw error; // Last attempt failed
                }

                // Exponential backoff: 1s, 2s, 4s
                const delay = Math.pow(2, i) * 1000;
                await new Promise((resolve) => setTimeout(resolve, delay));
              }
            }
          });
        };

        const rpcData = await fetchWithRetry();

        if (!rpcData || rpcData.length === 0) {
          // No user role found - normal for new users
          logger.auth('No user roles found - user needs onboarding');
          setUserRole(null);
          setOrganization(null);
          setHasOrganization(false);
          setNeedsOnboarding(true);
          dispatch({ type: 'ORG_FETCH_SUCCESS' });
          return;
        }

        // Validate RPC response structure
        if (!Array.isArray(rpcData)) {
          logger.error('Invalid RPC response format:', rpcData);
          throw new Error('Invalid organization data format');
        }

        logger.auth('Found orgs for user via RPC:', rpcData?.length || 0);

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
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', roleData.organization_id)
          .maybeSingle();

        if (orgError) {
          logger.error('Organization fetch error:', orgError);
          setAuthError(orgError as Error);
          setOrganization(null);
          setHasOrganization(false);
          setNeedsOnboarding(true);
          return;
        }

        if (!orgData) {
          logger.error('Organization not found for role:', roleData);
          setOrganization(null);
          setHasOrganization(false);
          setNeedsOnboarding(true);
          return;
        }

        logger.auth('Organization found:', orgData);
        setOrganization(orgData);
        setHasOrganization(true);
        // Treat org as onboarded if flag is true, OR if it has the minimum
        // required fields filled in (guards against stale default=false records).
        const effectivelyOnboarded =
          orgData.onboarding_completed ||
          (!!orgData.name && !!orgData.contact_email);
        setNeedsOnboarding(!effectivelyOnboarded);
        
        // PHASE 3: Cache successful fetch with LRU management
        addToOrgCache(userId, { 
          org: orgData, 
          role: roleData, 
          timestamp: Date.now() 
        });
        failedFetches.delete(userId); // Clear circuit breaker on success
        
        dispatch({ type: 'ORG_FETCH_SUCCESS' });
      } catch (error) {
        logger.error('Unexpected error in fetchOrganization:', error);

        // PHASE 4: Set circuit breaker on failure
        failedFetches.set(userId, Date.now());

        // Enhanced error handling
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        const isTimeoutError = errorMessage.includes('timeout');
        const isNetworkError =
          errorMessage.includes('fetch') || errorMessage.includes('network');

        if (isTimeoutError) {
          // Clear cache to force fresh fetch next time
          orgCache.delete(userId);
          setUserRole(null);
          setOrganization(null);
          setHasOrganization(false);
          setNeedsOnboarding(false); // Don't force onboarding on timeout
          dispatch({ type: 'ORG_FETCH_SUCCESS' });
        } else if (isNetworkError) {
          logger.error('Network error during organization fetch');
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
      const userId = user?.id;
      await supabase.auth.signOut();
      // Clear all caches for this user
      if (userId) {
        orgCache.delete(userId);
        clearSessionCache(userId);
        failedFetches.delete(userId);
      }
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
      // Bust both caches so we get fresh data from Supabase
      orgCache.delete(user.id);
      clearSessionCache(user.id);
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
