import { PolicyApi } from '@/api';
import { ROUTES } from '@/constants';
import { useDialog, useFormSubmission } from '@/lib/hooks';
import { CreatePolicyFormState, PolicyFormErrors, validateCreatePolicy } from '@/lib/validators';
import { CreatePolicyData, Policy, UpdatePolicyData } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const initialState: CreatePolicyFormState = {
  id: '',
  name: '',
  amount: '',
  unit: 'FIXED',
  isDeleted: false,
};

export function usePolicyForm(policyId?: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreatePolicyFormState>(initialState);
  const [errors, setErrors] = useState<PolicyFormErrors>({});
  const [isLoading, setIsLoading] = useState(!!policyId);
  const isEditMode = !!policyId;

  // Single form submission hook with dynamic messages
  const { submit, isSubmitting } = useFormSubmission<
    CreatePolicyFormState,
    CreatePolicyData | UpdatePolicyData,
    Policy
  >({
    successMessage: isEditMode ? 'Policy updated successfully' : 'Policy added successfully',
    errorMessage: isEditMode ? 'Failed to update policy' : 'Failed to add policy',
  });

  const { dialog, openDialog, handleConfirm, handleCancel: handleDialogCancel } = useDialog();

  // Load policy data when editing
  useEffect(() => {
    if (!policyId) return;

    const loadPolicy = async () => {
      try {
        setIsLoading(true);
        const policy = await PolicyApi.getPolicyById(policyId);

        // Transform policy data to form state
        setForm({
          id: policy.id || '',
          name: policy.name || '',
          amount: policy.amount.toString() || '',
          unit: policy.unit || 'FIXED',
          isDeleted: policy.isDeleted,
        });
      } catch (error) {
        console.error('Failed to load policy:', error);
        // Redirect to policies list if policy not found
        router.push(ROUTES.DASHBOARD.POLICIES);
      } finally {
        setIsLoading(false);
      }
    };

    loadPolicy();
  }, [policyId, router]);

  const setField = useCallback(
    (key: keyof CreatePolicyFormState, value: string | boolean | 'FIXED' | 'PER_DAY') => {
      setForm(prev => ({ ...prev, [key]: value }));

      // Clear error when user starts typing
      if (key in errors && errors[key as keyof PolicyFormErrors]) {
        setErrors(prev => ({ ...prev, [key]: undefined }));
      }
    },
    [errors]
  );

  const validate = useCallback((): string | null => {
    const { errors: newErrors, firstError } = validateCreatePolicy(form);
    setErrors(newErrors as PolicyFormErrors);
    return firstError;
  }, [form]);

  // Memoized transform function
  const transformFormData = useCallback(
    (formData: CreatePolicyFormState) => ({
      id: formData.id.trim(),
      name: formData.name.trim(),
      amount: parseFloat(formData.amount),
      unit: formData.unit,
      isDeleted: formData.isDeleted,
    }),
    []
  );

  const transformDataForCreate = useCallback(
    (formData: CreatePolicyFormState): CreatePolicyData =>
      transformFormData(formData) as CreatePolicyData,
    [transformFormData]
  );

  const transformDataForUpdate = useCallback(
    (formData: CreatePolicyFormState): Omit<CreatePolicyData, 'id'> => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...rest } = transformFormData(formData);
      return rest;
    },
    [transformFormData]
  );

  const resetForm = useCallback(() => {
    setForm(initialState);
    setErrors({});
  }, []);

  const handleCancel = useCallback(() => {
    const action = isEditMode ? 'Edit' : 'Add';
    openDialog({
      title: `Cancel ${action} Policy`,
      message: `Are you sure you want to cancel? All unsaved changes will be lost.`,
      confirmText: 'Yes, Cancel',
      cancelText: 'No, Continue',
      onConfirm: () => {
        router.push(ROUTES.DASHBOARD.POLICIES);
      },
    });
  }, [isEditMode, openDialog, router]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate form first
      const firstError = validate();
      if (firstError) {
        return;
      }

      // Open confirmation dialog
      const action = isEditMode ? 'update' : 'add';
      const actionText = isEditMode ? 'Update' : 'Add';
      openDialog({
        title: `Confirm ${actionText} Policy`,
        message: `Do you want to ${action} this policy "${form.name}"${isEditMode ? '' : ' to the system'}?`,
        confirmText: `${actionText} Policy`,
        cancelText: 'Cancel',
        onConfirm: async () => {
          if (isEditMode) {
            await submit(form, {
              validate,
              transformData: transformDataForUpdate as (
                formData: CreatePolicyFormState
              ) => CreatePolicyData | UpdatePolicyData,
              apiCall: (data: CreatePolicyData | UpdatePolicyData) =>
                PolicyApi.updatePolicy(policyId!, data as Partial<CreatePolicyData>),
              onSuccess: () => {
                // Invalidate policies cache to refresh data
                queryClient.invalidateQueries({ queryKey: ['policies'] });
                router.push(ROUTES.DASHBOARD.POLICIES);
              },
            });
          } else {
            await submit(form, {
              validate,
              transformData: transformDataForCreate,
              apiCall: (data: CreatePolicyData | UpdatePolicyData) =>
                PolicyApi.createPolicy(data as CreatePolicyData),
              onSuccess: () => {
                // Invalidate policies cache to refresh data
                queryClient.invalidateQueries({ queryKey: ['policies'] });
                resetForm();
                router.push(ROUTES.DASHBOARD.POLICIES);
              },
            });
          }
        },
      });
    },
    [
      isEditMode,
      validate,
      form,
      openDialog,
      transformDataForUpdate,
      transformDataForCreate,
      submit,
      queryClient,
      policyId,
      resetForm,
      router,
    ]
  );

  return {
    form,
    errors,
    isSubmitting,
    isLoading,
    isEditMode,
    setField,
    handleSubmit,
    resetForm,
    handleCancel,
    dialog,
    handleConfirm,
    handleDialogCancel,
  };
}
