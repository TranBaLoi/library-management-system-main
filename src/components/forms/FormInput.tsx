'use client';

import { Input, type InputProps } from '@chakra-ui/react';

export type FormInputProps = InputProps;

export function FormInput(props: FormInputProps) {
  return (
    <Input
      bg="layoutBg.500"
      border="1px solid"
      borderColor="gray.200"
      rounded="lg"
      height="50px"
      p={4}
      {...props}
    />
  );
}
