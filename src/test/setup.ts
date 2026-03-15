import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }
}));

// Mock AuthProvider
vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id' },
    loading: false,
    authChecked: true
  }))
}));

// Mock useOrganization hook
vi.mock('@/hooks/useOrganization', () => ({
  useOrganization: vi.fn(() => ({
    organization: {
      id: 'test-org-id',
      ui_language: 'en',
      ai_response_language: 'en',
      created_by: 'test-user-id'
    },
    loading: false
  }))
}));

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null
  })),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    error: null
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn()
  }))
}));
