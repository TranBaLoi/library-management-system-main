import { AuthApi } from '@/api';
import { toaster } from '@/components/ui/Toaster';
import { meQueryKey, useMe } from '@/lib/hooks';
import { queryClient } from '@/lib/query-client';
import { useEffect, useRef, useState } from 'react';

type ProfileFormData = {
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  avatarRemoved: boolean;
};

export function useProfileForm() {
  const { data: user, isLoading } = useMe();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    avatarRemoved: false,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Initialize form data when user data is loaded
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber || '',
        address: user.address || '',
        avatarRemoved: false,
      });
      // Clear avatar preview when user data changes
      setAvatarPreview(null);
      setAvatarFile(null);
    }
  }, [user]);

  const handleEditClick = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    // Reset form data to original user data
    if (user) {
      setFormData({
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber || '',
        address: user.address || '',
        avatarRemoved: false,
      });
    }
    // Clear avatar file and preview
    setAvatarFile(null);
    setAvatarPreview(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    try {
      setIsUpdating(true);

      // Call API to update profile
      const updatedUser = await AuthApi.updateMe({
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber || undefined,
        address: formData.address || undefined,
        avatar: avatarFile,
        removeAvatar: formData.avatarRemoved,
      });

      // Update the cache with the new user data
      queryClient.setQueryData(meQueryKey, updatedUser);
      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: meQueryKey });

      toaster.create({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully',
        type: 'success',
        duration: 3000,
      });

      setIsEditMode(false);
      // Clear avatar file and preview after successful save
      setAvatarFile(null);
      setAvatarPreview(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      toaster.create({
        title: 'Update failed',
        description: errorMessage,
        type: 'error',
        duration: 5000,
      });
      console.error('Profile update error:', errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRemoveAvatar = () => {
    setFormData(prev => ({
      ...prev,
      avatarRemoved: true,
    }));
    setAvatarFile(null);
    setAvatarPreview(null);
    // Reset file input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toaster.create({
          title: 'Invalid file type',
          description: 'Please upload a valid image file (JPG, PNG, GIF, or WebP)',
          type: 'error',
          duration: 5000,
        });
        // Reset file input on validation error
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toaster.create({
          title: 'File too large',
          description: 'Please upload an image smaller than 5MB',
          type: 'error',
          duration: 5000,
        });
        // Reset file input on validation error
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setAvatarFile(file);
      setFormData(prev => ({ ...prev, avatarRemoved: false }));

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarClick = () => {
    if (isEditMode) {
      fileInputRef.current?.click();
    }
  };

  return {
    user,
    isLoading,
    isUpdating,
    isEditMode,
    formData,
    avatarFile,
    avatarPreview,
    fileInputRef,
    handleEditClick,
    handleCancelEdit,
    handleSave,
    handleInputChange,
    handleRemoveAvatar,
    handleAvatarChange,
    handleAvatarClick,
  };
}
