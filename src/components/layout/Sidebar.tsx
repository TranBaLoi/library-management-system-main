'use client';

import { AuthApi } from '@/api';
import { Button } from '@/components/buttons';
import { Dialog } from '@/components/ui/Dialog';
import { ROUTES } from '@/constants';
import { useMe } from '@/lib/hooks';
import { HStack, Image, Text, VStack } from '@chakra-ui/react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconType } from 'react-icons';
import {
  IoChevronDown,
  IoChevronUp,
  IoLogOutOutline,
  IoPersonOutline,
  IoSettingsOutline,
} from 'react-icons/io5';

type SidebarItem = {
  label: string;
  href: string;
  icon?: IconType;
  children?: SidebarItem[];
};

type SidebarProps = {
  items: SidebarItem[];
  showProfileInSettings?: boolean; // If true, Settings will be a parent with Profile as child (Dashboard). If false, Settings is just a button (User pages)
};

const getSettingsItem = (showProfileInSettings: boolean): SidebarItem => ({
  label: 'Settings',
  href: ROUTES.SETTINGS,
  icon: IoSettingsOutline,
  children: showProfileInSettings
    ? [
        {
          label: 'Profile',
          href: ROUTES.DASHBOARD.PROFILE,
          icon: IoPersonOutline,
        },
      ]
    : undefined,
});

export function Sidebar({ items = [], showProfileInSettings = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const SETTINGS_ITEM = getSettingsItem(showProfileInSettings);
  const { data: user } = useMe();

  const isAdminOrLibrarian = user?.role === 'ADMIN' || user?.role === 'LIBRARIAN';

  // Auto-expand submenus that have active children
  const getInitialExpandedItems = () => {
    const expanded: string[] = [];
    const allItems = [...items, SETTINGS_ITEM];
    allItems.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(
          child => pathname === child.href || pathname.startsWith(`${child.href}/`)
        );
        if (hasActiveChild) {
          expanded.push(item.label);
        }
      }
    });
    return expanded;
  };

  const [expandedItems, setExpandedItems] = useState<string[]>(getInitialExpandedItems);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  // Check if the path is active (exact match only)
  const isPathActive = (currentPath: string, href: string) => {
    if (href === '/') return currentPath === '/';
    return currentPath === href;
  };

  // Toggle submenu
  const toggleSubmenu = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label) ? prev.filter(item => item !== label) : [...prev, label]
    );
  };

  const handleConfirmLogout = async () => {
    try {
      await AuthApi.logout();
    } finally {
      setIsLogoutDialogOpen(false);
      router.replace(ROUTES.AUTH.LOGIN);
    }
  };

  const handleOpenLogoutDialog = () => {
    setIsLogoutDialogOpen(true);
  };

  const handleCloseLogoutDialog = () => {
    setIsLogoutDialogOpen(false);
  };

  return (
    <>
      <VStack gap={4} px={6} py={4} align="stretch" w="full">
        <HStack align="center" gap={2} py={6} px={4}>
          <Image src="/logo.png" alt="Logo" h="28px" />
          <Text fontSize="2xl" fontWeight="semibold" lineHeight="0">
            LIBRA
          </Text>
        </HStack>

        {items.map(item => {
          const isActive = isPathActive(pathname, item.href);
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedItems.includes(item.label);

          return (
            <VStack key={item.label} gap={0} align="stretch">
              {/* Main item */}
              <Button
                href={hasChildren || !item.href ? undefined : item.href}
                label={item.label}
                icon={item.icon}
                isActive={isActive}
                variantType="sidebar"
                onClick={hasChildren ? () => toggleSubmenu(item.label) : undefined}
                rightIcon={hasChildren ? (isExpanded ? IoChevronUp : IoChevronDown) : undefined}
              />

              {/* Submenu items */}
              {hasChildren && isExpanded && item.children && (
                <VStack gap={1} align="stretch" pl={8} mt={1}>
                  {item.children.map((child, index) => (
                    <Button
                      key={`${item.label}-${child.label}-${index}`}
                      href={child.href}
                      label={child.label}
                      isActive={pathname === child.href}
                      variantType="sidebar-submenu"
                    />
                  ))}
                </VStack>
              )}
            </VStack>
          );
        })}

        {isAdminOrLibrarian && (
          <>
            <HStack my={4} h="1px" bg="gray.200" />

            {/* Settings - Parent with Profile child (Dashboard) or simple button (User pages) */}
            {showProfileInSettings ? (
              <VStack gap={0} align="stretch">
                <Button
                  href={SETTINGS_ITEM.children ? undefined : SETTINGS_ITEM.href}
                  label={SETTINGS_ITEM.label}
                  icon={SETTINGS_ITEM.icon}
                  isActive={pathname === SETTINGS_ITEM.href}
                  variantType="sidebar"
                  onClick={
                    SETTINGS_ITEM.children ? () => toggleSubmenu(SETTINGS_ITEM.label) : undefined
                  }
                  rightIcon={
                    SETTINGS_ITEM.children
                      ? expandedItems.includes(SETTINGS_ITEM.label)
                        ? IoChevronUp
                        : IoChevronDown
                      : undefined
                  }
                />

                {/* Submenu items */}
                {SETTINGS_ITEM.children && expandedItems.includes(SETTINGS_ITEM.label) && (
                  <VStack gap={1} align="stretch" pl={8} mt={1}>
                    {SETTINGS_ITEM.children.map(child => (
                      <Button
                        key={child.href}
                        href={child.href}
                        label={child.label}
                        isActive={pathname === child.href}
                        variantType="sidebar-submenu"
                      />
                    ))}
                  </VStack>
                )}
              </VStack>
            ) : (
              <Button
                href={ROUTES.SETTINGS}
                label="Settings"
                icon={IoSettingsOutline}
                isActive={pathname === ROUTES.SETTINGS}
                variantType="sidebar"
              />
            )}

            <Button
              onClick={handleOpenLogoutDialog}
              label="Logout"
              icon={IoLogOutOutline}
              variantType="sidebar"
            />
          </>
        )}
      </VStack>

      <Dialog
        isOpen={isLogoutDialogOpen}
        onClose={handleCloseLogoutDialog}
        title="Confirm logout"
        content="Are you sure you want to log out?"
        buttons={[
          {
            label: 'Cancel',
            variant: 'secondary',
            onClick: handleCloseLogoutDialog,
          },
          {
            label: 'Logout',
            variant: 'primary',
            onClick: handleConfirmLogout,
          },
        ]}
        maxW="400px"
      />
    </>
  );
}
