'use client';

import { Footer, Header } from '@/components/layout';
import { Box, Flex } from '@chakra-ui/react';
import { ReactNode } from 'react';

type LayoutProps = {
  children: ReactNode;
  sidebar: ReactNode;
};

export function Layout({ children, sidebar }: LayoutProps) {
  return (
    <Flex minH="100vh">
      <Box w="280px" bg="white" position="fixed" top={0} left={0} h="100vh" overflowY="auto">
        {sidebar}
      </Box>
      <Box
        flex="1"
        bg="layoutBg.500"
        px={6}
        py={4}
        ml="280px"
        minH="100vh"
        display="flex"
        flexDirection="column"
      >
        <Header />
        <Box p={4} rounded="lg" bg="white" flex="1" display="flex" flexDirection="column">
          {children}
        </Box>
        <Footer />
      </Box>
    </Flex>
  );
}
