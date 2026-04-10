'use client';

import { appSystem } from '@/lib/theme';
import { ChakraProvider } from '@chakra-ui/react';
import type { ThemeProviderProps } from 'next-themes';
import { ColorModeProvider } from './ColorMode';

export function Provider(props: ThemeProviderProps) {
  return (
    <ChakraProvider value={appSystem}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  );
}
