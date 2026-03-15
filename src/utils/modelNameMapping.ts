// Model Name Mapping - Display names to API model IDs

export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  // OpenAI Models
  'gpt-5-2025-08-07': 'GPT-5',
  'gpt-5-mini-2025-08-07': 'GPT-5 Mini',
  'gpt-5-nano-2025-08-07': 'GPT-5 Nano',
  'gpt-4.1-2025-04-14': 'GPT-4.1',
  'gpt-4.1-mini-2025-04-14': 'GPT-4.1 Mini',
  'o3-2025-04-16': 'O3',
  'o4-mini-2025-04-16': 'O4 Mini',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
};

export const MODEL_API_IDS: Record<string, string> = {
  // Reverse mapping: Display name to API ID
  'GPT-5': 'gpt-5-2025-08-07',
  'GPT-5 Mini': 'gpt-5-mini-2025-08-07',
  'GPT-5 Nano': 'gpt-5-nano-2025-08-07',
  'GPT-4.1': 'gpt-4.1-2025-04-14',
  'GPT-4.1 Mini': 'gpt-4.1-mini-2025-04-14',
  'O3': 'o3-2025-04-16',
  'O4 Mini': 'o4-mini-2025-04-16',
  'GPT-4o': 'gpt-4o',
  'GPT-4o Mini': 'gpt-4o-mini',
};

/**
 * Get display name for a model API ID
 */
export function getModelDisplayName(apiId: string): string {
  return MODEL_DISPLAY_NAMES[apiId] || apiId;
}

/**
 * Get API ID for a model display name
 */
export function getModelApiId(displayName: string): string {
  return MODEL_API_IDS[displayName] || displayName;
}

/**
 * Check if a string is a display name (needs conversion to API ID)
 */
export function isDisplayName(name: string): boolean {
  return name in MODEL_API_IDS;
}

/**
 * Check if a string is an API ID (can be used directly)
 */
export function isApiId(name: string): boolean {
  return name in MODEL_DISPLAY_NAMES;
}

/**
 * Normalize a model name to API ID (handles both display names and API IDs)
 */
export function normalizeToApiId(name: string): string {
  if (isDisplayName(name)) {
    return getModelApiId(name);
  }
  return name; // Already an API ID or unknown
}

/**
 * Normalize a model name to display name (handles both display names and API IDs)
 */
export function normalizeToDisplayName(name: string): string {
  if (isApiId(name)) {
    return getModelDisplayName(name);
  }
  return name; // Already a display name or unknown
}
