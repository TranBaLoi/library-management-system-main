import {
  IconButton as ChakraIconButton,
  IconButtonProps as ChakraIconButtonProps,
} from '@chakra-ui/react';
import { ReactNode } from 'react';

interface IconButtonProps extends ChakraIconButtonProps {
  children: ReactNode;
  borderColor?: string;
}

export function IconButton({ children, borderColor = 'white', ...props }: IconButtonProps) {
  return (
    <ChakraIconButton
      height="42px"
      width="42px"
      rounded="lg"
      bg="white"
      color="secondary.500"
      border="1px solid"
      borderColor={borderColor}
      _hover={{ bg: 'secondary.500', color: 'white' }}
      {...props}
    >
      {children}
    </ChakraIconButton>
  );
}
