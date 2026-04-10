'use client';

import {
  Button,
  FormDivider,
  FormInput,
  FormSection,
  FormTextarea,
  Spinner,
  Tag,
} from '@/components';
import { ROUTES } from '@/constants';
import { USER_ROLES } from '@/constants/user';
import { useProfileForm } from '@/lib/hooks';
import { Box, Card, Flex, Grid, HStack, Image, Input, Stack, Text } from '@chakra-ui/react';
import { UserStatus } from '@prisma/client';
import {
  FiCalendar,
  FiEdit,
  FiMail,
  FiMapPin,
  FiPhone,
  FiUpload,
  FiUser,
  FiX,
} from 'react-icons/fi';
import { RiLockPasswordLine } from 'react-icons/ri';

export default function ProfilePage() {
  const {
    user,
    isLoading,
    isUpdating,
    isEditMode,
    formData,
    avatarPreview,
    fileInputRef,
    handleEditClick,
    handleCancelEdit,
    handleSave,
    handleInputChange,
    handleRemoveAvatar,
    handleAvatarChange,
    handleAvatarClick,
  } = useProfileForm();

  if (isLoading) {
    return (
      <Flex justify="center" align="center" minH="400px">
        <Spinner size="48px" />
      </Flex>
    );
  }

  if (!user) {
    return (
      <Flex justify="center" align="center" minH="400px">
        <Text fontSize="lg" color="gray.500">
          No user data available
        </Text>
      </Flex>
    );
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusLabel = (status: UserStatus) => {
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  return (
    <Box>
      <Stack gap={0}>
        {/* Profile Header Card */}
        <Card.Root bg="white" borderRadius="lg" overflow="hidden">
          <Card.Body p={4}>
            <Flex gap={6} align="start" flexDirection={{ base: 'column', md: 'row' }}>
              {/* Avatar */}
              <Box flexShrink={0} position="relative">
                <Box
                  position="relative"
                  onClick={handleAvatarClick}
                  cursor={isEditMode ? 'pointer' : 'default'}
                  _hover={isEditMode ? { opacity: 0.8 } : {}}
                  transition="opacity 0.2s"
                >
                  <Image
                    src={
                      formData.avatarRemoved
                        ? 'https://via.placeholder.com/150?text=No+Avatar'
                        : avatarPreview ||
                          user.avatarUrl ||
                          'https://via.placeholder.com/150?text=' + user.fullName.charAt(0)
                    }
                    alt={user.fullName}
                    h="120px"
                    w="120px"
                    borderRadius="full"
                    objectFit="cover"
                    border="4px solid"
                    borderColor="paginationBg.500"
                    opacity={formData.avatarRemoved ? 0.5 : 1}
                  />
                  {isEditMode && (
                    <Box
                      position="absolute"
                      bottom="0"
                      left="0"
                      right="0"
                      bg="secondary.500"
                      opacity={0.8}
                      color="white"
                      py={2}
                      textAlign="center"
                      borderBottomRadius="full"
                      fontSize="sm"
                      fontWeight="medium"
                    >
                      <Flex align="center" justify="center" gap={1}>
                        <FiUpload size={14} />
                        <Text fontSize="xs">Upload</Text>
                      </Flex>
                    </Box>
                  )}
                </Box>
                {isEditMode && !formData.avatarRemoved && (user.avatarUrl || avatarPreview) && (
                  <Box
                    as="button"
                    position="absolute"
                    top="5px"
                    right="5px"
                    bg="secondary.500"
                    color="white"
                    p={1}
                    borderRadius="full"
                    cursor="pointer"
                    onClick={handleRemoveAvatar}
                    transition="background 0.2s"
                  >
                    <FiX size={16} />
                  </Box>
                )}
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleAvatarChange}
                  display="none"
                />
              </Box>

              <Box width="100%" display="flex" justifyContent="space-between" alignItems="start">
                {/* User Info */}
                <Stack flex={1} gap={3}>
                  <Box flex={1}>
                    <Box mb={2} width="80%">
                      <FormInput
                        value={formData.fullName}
                        onChange={e => handleInputChange('fullName', e.target.value)}
                        fontSize="2xl"
                        fontWeight="semibold"
                        placeholder="Enter your full name"
                        disabled={!isEditMode}
                        _disabled={{
                          opacity: 1,
                          bg: 'transparent',
                          border: 'none',
                          padding: 0,
                        }}
                      />
                    </Box>
                    <Flex justify="space-between" align="center">
                      <HStack gap={3}>
                        <Tag variantType="reserved">{USER_ROLES[user.role]}</Tag>
                        <Tag
                          variantType={user.status === UserStatus.ACTIVE ? 'active' : 'inactive'}
                        >
                          {getStatusLabel(user.status)}
                        </Tag>
                      </HStack>
                    </Flex>
                  </Box>

                  <Text color="secondaryText.500" fontSize="sm">
                    Welcome to your profile page. Here you can view your personal information and
                    account details.
                  </Text>
                </Stack>

                <HStack gap={3}>
                  {isEditMode ? (
                    <>
                      <Button
                        variantType="primary"
                        label={isUpdating ? 'Saving...' : 'Save Changes'}
                        onClick={handleSave}
                        disabled={isUpdating}
                        h="40px"
                        fontSize="sm"
                      />
                      <Button
                        variantType="secondary"
                        label="Cancel"
                        onClick={handleCancelEdit}
                        disabled={isUpdating}
                        h="40px"
                        fontSize="sm"
                      />
                    </>
                  ) : (
                    <>
                      <Button
                        variantType="primary"
                        label="Edit Profile"
                        onClick={handleEditClick}
                        icon={FiEdit}
                        h="40px"
                        fontSize="sm"
                      />
                      <Button
                        variantType="secondary"
                        label="Change Password"
                        h="40px"
                        fontSize="sm"
                        icon={RiLockPasswordLine}
                        href={ROUTES.AUTH.CHANGE_PASSWORD}
                      />
                    </>
                  )}
                </HStack>
              </Box>
            </Flex>
          </Card.Body>
        </Card.Root>

        {/* Contact Information Card */}
        <Card.Root bg="white" borderRadius="lg">
          <Card.Body p={6}>
            <FormSection title="Contact Information">
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6} mt={6}>
                {/* Email */}
                <HStack gap={4} align="start">
                  <Box p={3} bg="primary.200" borderRadius="lg" color="primary.500" flexShrink={0}>
                    <FiMail size={24} />
                  </Box>
                  <Stack gap={1} flex={1}>
                    <Text fontSize="sm" color="secondaryText.500" fontWeight="medium">
                      Email Address
                    </Text>
                    <Text fontSize="sm" fontWeight="medium" color="primaryText.500">
                      {user.email}
                    </Text>
                  </Stack>
                </HStack>

                {/* Phone */}
                <HStack gap={4} align="start">
                  <Box p={3} bg="primary.200" borderRadius="lg" color="primary.500" flexShrink={0}>
                    <FiPhone size={24} />
                  </Box>
                  <Stack gap={1} flex={1}>
                    <Text fontSize="sm" color="secondaryText.500" fontWeight="medium">
                      Phone Number
                    </Text>
                    <FormInput
                      value={formData.phoneNumber}
                      onChange={e => handleInputChange('phoneNumber', e.target.value)}
                      type="tel"
                      placeholder="Not provided"
                      fontSize="sm"
                      height="40px"
                      disabled={!isEditMode}
                      _disabled={{
                        opacity: 1,
                        bg: 'transparent',
                        border: 'none',
                        padding: 0,
                        height: '20px',
                      }}
                    />
                  </Stack>
                </HStack>

                {/* Address */}
                <Box gridColumn={{ base: '1', md: 'span 2' }}>
                  <HStack gap={4} align="start">
                    <Box
                      p={3}
                      bg="primary.200"
                      borderRadius="lg"
                      color="primary.500"
                      flexShrink={0}
                    >
                      <FiMapPin size={24} />
                    </Box>
                    <Stack gap={1} flex={1}>
                      <Text fontSize="sm" color="secondaryText.500" fontWeight="medium">
                        Address
                      </Text>
                      <FormTextarea
                        value={formData.address}
                        onChange={e => handleInputChange('address', e.target.value)}
                        placeholder="Not provided"
                        fontSize="sm"
                        rows={3}
                        disabled={!isEditMode}
                        _disabled={{
                          opacity: 1,
                          bg: 'transparent',
                          border: 'none',
                          padding: 0,
                          height: '20px',
                          resize: 'none',
                          overflow: 'hidden',
                        }}
                      />
                    </Stack>
                  </HStack>
                </Box>
              </Grid>
            </FormSection>
          </Card.Body>
        </Card.Root>

        <FormDivider />

        {/* Account Information Card */}
        <Card.Root bg="white" borderRadius="lg">
          <Card.Body p={6}>
            <FormSection title="Account Information">
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6} mt={6}>
                {/* User ID */}
                <HStack gap={4} align="start">
                  <Box p={3} bg="primary.200" borderRadius="lg" color="primary.500" flexShrink={0}>
                    <FiUser size={24} />
                  </Box>
                  <Stack gap={1}>
                    <Text fontSize="sm" color="secondaryText.500" fontWeight="medium">
                      User ID
                    </Text>
                    <Text fontSize="sm" fontWeight="semibold" color="primaryText.500">
                      #{user.id}
                    </Text>
                  </Stack>
                </HStack>

                {/* Created Date */}
                <HStack gap={4} align="start">
                  <Box p={3} bg="primary.200" borderRadius="lg" color="primary.500" flexShrink={0}>
                    <FiCalendar size={24} />
                  </Box>
                  <Stack gap={1}>
                    <Text fontSize="sm" color="secondaryText.500" fontWeight="medium">
                      Member Since
                    </Text>
                    <Text fontSize="sm" fontWeight="semibold" color="primaryText.500">
                      {formatDate(user.createdAt)}
                    </Text>
                  </Stack>
                </HStack>

                {/* Updated Date */}
                <HStack gap={4} align="start">
                  <Box p={3} bg="primary.200" borderRadius="lg" color="primary.500" flexShrink={0}>
                    <FiCalendar size={24} />
                  </Box>
                  <Stack gap={1}>
                    <Text fontSize="sm" color="secondaryText.500" fontWeight="medium">
                      Last Updated
                    </Text>
                    <Text fontSize="sm" fontWeight="semibold" color="primaryText.500">
                      {formatDate(user.updatedAt)}
                    </Text>
                  </Stack>
                </HStack>
              </Grid>
            </FormSection>
          </Card.Body>
        </Card.Root>
      </Stack>
    </Box>
  );
}
