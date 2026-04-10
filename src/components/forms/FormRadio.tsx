'use client';

import { HStack, RadioGroup } from '@chakra-ui/react';

export interface FormRadioOption {
  value: string;
  label: string;
}

export interface FormRadioProps {
  value: string;
  onChange: (value: string) => void;
  options: FormRadioOption[];
  disabled?: boolean;
}

/**
 * Radio button group component for forms
 */
export function FormRadio({
  value,
  onChange,
  options,
  disabled = false,
}: FormRadioProps) {
  return (
    <RadioGroup.Root
      value={value || undefined}
      onValueChange={e => onChange(e.value || '')}
      disabled={disabled}
    >
      <HStack gap={6}>
        {options.map(option => (
          <RadioGroup.Item 
            key={option.value} 
            value={option.value}
            cursor={disabled ? 'not-allowed' : 'pointer'}
          >
            <RadioGroup.ItemHiddenInput />
            <RadioGroup.ItemIndicator
              borderWidth="2px"
              borderColor="gray.200"
              _checked={{
                bg: 'primary.500',
                borderColor: 'primary.500',
              }}
              _hover={{
                borderColor: 'primary.500',
              }}
              _disabled={{
                opacity: 0.5,
                cursor: 'not-allowed',
                borderColor: 'gray.200',
              }}
            />
            <RadioGroup.ItemText fontSize="sm" cursor={disabled ? 'not-allowed' : 'pointer'}>
              {option.label}
            </RadioGroup.ItemText>
          </RadioGroup.Item>
        ))}
      </HStack>
    </RadioGroup.Root>
  );
}

