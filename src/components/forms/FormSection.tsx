import { ReactNode } from 'react';
import { Stack, Text } from '@chakra-ui/react';

interface FormSectionProps {
  title: string;
  children: ReactNode;
}

export function FormSection({ title, children }: FormSectionProps) {
  return (
    <>
      <Text fontSize="lg" fontWeight="bold">
        {title}
      </Text>
      <Stack gap={4}>{children}</Stack>
    </>
  );
}
