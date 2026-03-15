import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, UseFormReturn, FieldValues, Path, DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface UseOptimizedFormOptions<T extends FieldValues> {
  schema?: z.ZodSchema<T>;
  defaultValues?: DefaultValues<T>;
  mode?: 'onBlur' | 'onChange' | 'onSubmit' | 'onTouched' | 'all';
  reValidateMode?: 'onBlur' | 'onChange' | 'onSubmit';
  criteriaMode?: 'firstError' | 'all';
  shouldFocusError?: boolean;
  shouldUnregister?: boolean;
  shouldUseNativeValidation?: boolean;
  delayError?: number;
  // Custom options
  autoSave?: boolean;
  autoSaveDelay?: number;
  debounceValidation?: boolean;
  validationDelay?: number;
  showErrorsOnBlur?: boolean;
  showErrorsOnChange?: boolean;
}

interface UseOptimizedFormReturn<T extends FieldValues> {
  // Core form methods
  register: UseFormReturn<T>['register'];
  handleSubmit: UseFormReturn<T>['handleSubmit'];
  watch: UseFormReturn<T>['watch'];
  setValue: UseFormReturn<T>['setValue'];
  getValues: UseFormReturn<T>['getValues'];
  reset: UseFormReturn<T>['reset'];
  trigger: UseFormReturn<T>['trigger'];
  clearErrors: UseFormReturn<T>['clearErrors'];
  setError: UseFormReturn<T>['setError'];
  formState: UseFormReturn<T>['formState'];
  // Enhanced methods
  setFieldValue: (name: Path<T>, value: any) => void;
  setFieldError: (name: Path<T>, error: string) => void;
  clearFieldError: (name: Path<T>) => void;
  clearAllErrors: () => void;
  resetForm: (values?: DefaultValues<T>) => void;
  // Performance methods
  debouncedSetValue: (name: Path<T>, value: any) => void;
  // Auto-save methods
  isAutoSaving: boolean;
  lastAutoSave: Date | null;
  // Validation methods
  validateField: (name: Path<T>) => Promise<boolean>;
  validateAll: () => Promise<boolean>;
  // Utility methods
  getFieldState: (name: Path<T>) => {
    isDirty: boolean;
    isTouched: boolean;
    invalid: boolean;
    isValidating: boolean;
    error?: any;
  };
  isFieldDirty: (name: Path<T>) => boolean;
  isFieldTouched: (name: Path<T>) => boolean;
  isFieldInvalid: (name: Path<T>) => boolean;
}

export function useOptimizedForm<T extends FieldValues>(
  options: UseOptimizedFormOptions<T> = {}
): UseOptimizedFormReturn<T> {
  const {
    schema,
    defaultValues,
    mode = 'onBlur',
    reValidateMode = 'onChange',
    criteriaMode = 'firstError',
    shouldFocusError = true,
    shouldUnregister = false,
    shouldUseNativeValidation = false,
    delayError,
    autoSave = false,
    autoSaveDelay = 2000,
    debounceValidation = true,
    validationDelay = 300,
    showErrorsOnBlur = true,
    showErrorsOnChange = false,
  } = options;

  // Create resolver based on schema
  const resolver = useMemo(() => {
    if (schema) {
      return zodResolver(schema);
    }
    return undefined;
  }, [schema]);

  // Initialize form
  const form = useForm<T>({
    resolver,
    defaultValues,
    mode,
    reValidateMode,
    criteriaMode,
    shouldFocusError,
    shouldUnregister,
    shouldUseNativeValidation,
    ...(typeof delayError === 'number' && { delayError }),
  });

  // Auto-save state
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced validation
  const validationTimeoutRef = useRef<NodeJS.Timeout>();
  const [debouncedErrors, setDebouncedErrors] = useState<Record<string, any>>({});

  // Enhanced setValue with auto-save
  const setFieldValue = useCallback((name: Path<T>, value: any) => {
    form.setValue(name, value, {
      shouldValidate: showErrorsOnChange,
      shouldDirty: true,
      shouldTouch: true,
    });

    // Trigger auto-save if enabled
    if (autoSave) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        setIsAutoSaving(true);
        // Here you would typically call your save function
        // saveFormData(form.getValues());
        setLastAutoSave(new Date());
        setIsAutoSaving(false);
      }, autoSaveDelay);
    }
  }, [form, autoSave, autoSaveDelay, showErrorsOnChange]);

  // Debounced setValue for performance
  const debouncedSetValue = useCallback((name: Path<T>, value: any) => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    validationTimeoutRef.current = setTimeout(() => {
      setFieldValue(name, value);
    }, validationDelay);
  }, [setFieldValue, validationDelay]);

  // Set field error
  const setFieldError = useCallback((name: Path<T>, error: string) => {
    form.setError(name, {
      type: 'manual',
      message: error,
    });
  }, [form]);

  // Clear field error
  const clearFieldError = useCallback((name: Path<T>) => {
    form.clearErrors(name);
  }, [form]);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    form.clearErrors();
  }, [form]);

  // Reset form with optional new values
  const resetForm = useCallback((values?: DefaultValues<T>) => {
    form.reset(values || defaultValues);
    setDebouncedErrors({});
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
  }, [form, defaultValues]);

  // Validate single field
  const validateField = useCallback(async (name: Path<T>): Promise<boolean> => {
    try {
      await form.trigger(name);
      return !form.formState.errors[name];
    } catch {
      return false;
    }
  }, [form]);

  // Validate all fields
  const validateAll = useCallback(async (): Promise<boolean> => {
    try {
      const isValid = await form.trigger();
      return isValid;
    } catch {
      return false;
    }
  }, [form]);

  // Get enhanced field state
  const getFieldState = useCallback((name: Path<T>) => {
    const fieldState = form.getFieldState(name);
    return {
      isDirty: fieldState.isDirty,
      isTouched: fieldState.isTouched,
      invalid: !!fieldState.error,
      isValidating: false,
      error: fieldState.error,
    };
  }, [form]);

  // Field state helpers
  const isFieldDirty = useCallback((name: Path<T>) => {
    return form.getFieldState(name).isDirty;
  }, [form]);

  const isFieldTouched = useCallback((name: Path<T>) => {
    return form.getFieldState(name).isTouched;
  }, [form]);

  const isFieldInvalid = useCallback((name: Path<T>) => {
    return !!form.getFieldState(name).error;
  }, [form]);

  // Watch for changes and update debounced errors
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (debounceValidation && name && type === 'change') {
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
        }

        validationTimeoutRef.current = setTimeout(async () => {
          try {
            await form.trigger(name);
            const errors = form.formState.errors;
            setDebouncedErrors(errors);
          } catch (error) {
            console.warn('Validation error:', error);
          }
        }, validationDelay);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, debounceValidation, validationDelay]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced form state with debounced errors
  const enhancedFormState = useMemo(() => ({
    ...form.formState,
    errors: debounceValidation ? debouncedErrors : form.formState.errors,
  }), [form.formState, debouncedErrors, debounceValidation]);

  return {
    // Core form methods
    register: form.register,
    handleSubmit: form.handleSubmit as any,
    watch: form.watch,
    setValue: form.setValue,
    getValues: form.getValues,
    reset: form.reset,
    trigger: form.trigger,
    clearErrors: form.clearErrors,
    setError: form.setError,
    formState: enhancedFormState,
    // Enhanced methods
    setFieldValue,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    resetForm,
    debouncedSetValue,
    isAutoSaving,
    lastAutoSave,
    validateField,
    validateAll,
    getFieldState,
    isFieldDirty,
    isFieldTouched,
    isFieldInvalid,
  };
}

// Specialized form hooks for common use cases
export function useOptimizedFormWithValidation<T extends FieldValues>(
  schema: z.ZodSchema<T>,
  options: Omit<UseOptimizedFormOptions<T>, 'schema'> = {}
) {
  return useOptimizedForm<T>({
    ...options,
    schema,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
}

export function useOptimizedFormWithAutoSave<T extends FieldValues>(
  options: UseOptimizedFormOptions<T> & { saveFunction: (data: T) => Promise<void> }
) {
  const form = useOptimizedForm<T>({
    ...options,
    autoSave: true,
    autoSaveDelay: options.autoSaveDelay || 2000,
  });

  // Override auto-save with custom function
  useEffect(() => {
    if (form.isAutoSaving && options.saveFunction) {
      options.saveFunction(form.getValues());
    }
  }, [form.isAutoSaving, options.saveFunction]);

  return form;
}