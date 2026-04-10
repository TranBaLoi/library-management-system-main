'use client';

import { Footer, Sidebar } from '@/components/layout';
import { Box, Flex } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { UserHeader } from './UserHeader';

type UserLayoutProps = {
  children: ReactNode;
  sidebarItems?: Array<{
    label: string;
    href: string;
    children?: Array<{
      label: string;
      href: string;
    }>;
  }>;
};

export function UserLayout({ children, sidebarItems = [] }: UserLayoutProps) {
  return (
    <Flex minH="100vh">
      {/* Sidebar - Fixed position */}
      <Box w="280px" bg="white" position="fixed" top={0} left={0} h="100vh" overflowY="auto">
        <Sidebar items={sidebarItems} />
      </Box>

      {/* Main content area */}
      <Box flex="1" bg="layoutBg.500" p={8} pb={4} ml="280px" display="flex" flexDirection="column">
        {/* Header */}
        <UserHeader />

        {/* Content */}
        <Box flex="1" display="flex" flexDirection="column">
          {children}
        </Box>

        {/* Footer */}
        <Footer />
      </Box>
    </Flex>
  );
}
