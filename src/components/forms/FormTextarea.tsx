'use client';

import { Textarea, type TextareaProps } from '@chakra-ui/react';

export type FormTextareaProps = TextareaProps;

export function FormTextarea(props: FormTextareaProps) {
  return (
    <Textarea
      bg="layoutBg.500"
      border="1px solid"
      borderColor="gray.200"
      rounded="lg"
      rows={5}
      p={4}
      resize="vertical"
      {...props}
    />
  );
}
