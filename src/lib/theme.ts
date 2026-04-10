import {
  createSystem,
  defaultConfig,
  defineConfig,
  defineSemanticTokens,
  defineTokens,
} from '@chakra-ui/react';

const tokens = defineTokens({
  colors: {
    primary: { 200: { value: '#ff7b424d' }, 500: { value: '#ff7b42' } },
    secondary: { 500: { value: '#2D3E5C' } },
    paginationBg: { 500: { value: '#f0efea' } },
    layoutBg: { 500: { value: '#f7f6f4' } },
    primaryText: { 500: { value: '#191d26' } },
    secondaryText: { 500: { value: '#62716e' } },
    status: {
      Available: { value: '#e7f3ef' },
      Borrowed: { value: '#ffcbbf' },
      Damaged: { value: '#f9e8e9' },
      Lost: { value: '#ededef' },
      Reserved: { value: '#e5effa' },
    },
    statusText: {
      Available: { value: '#008b6b' },
      Borrowed: { value: '#161e25' },
      Damaged: { value: '#a2001d' },
      Lost: { value: '#7f8289' },
      Reserved: { value: '#0057b7' },
    },
  },
});

const semanticTokens = defineSemanticTokens({
  colors: {
    bg: { value: { _light: 'white', _dark: 'gray.900' } },
  },
});

export const appSystem = createSystem(
  defaultConfig,
  defineConfig({ theme: { tokens, semanticTokens } })
);
