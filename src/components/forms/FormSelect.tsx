'use client';

import { Button, Select, createListCollection, type HTMLChakraProps } from '@chakra-ui/react';

export type FormSelectItem = { value: string; label: string };

export type FormSelectProps = {
  items: FormSelectItem[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  fontWeight?: HTMLChakraProps<'div'>['fontWeight'];
  width?: HTMLChakraProps<'div'>['w'];
  height?: HTMLChakraProps<'div'>['h'];
  triggerSize?: 'xs' | 'sm' | 'md';
  bg?: HTMLChakraProps<'div'>['bg'];
  border?: HTMLChakraProps<'div'>['border'];
  borderColor?: HTMLChakraProps<'div'>['borderColor'];
  variantType?: 'default' | 'filter';
  id?: string;
  fontSize?: HTMLChakraProps<'div'>['fontSize'];
  disabled?: boolean;
};

export function FormSelect({
  items,
  value,
  onChange,
  placeholder,
  fontWeight = 'medium',
  width,
  height,
  triggerSize = 'sm',
  bg,
  border,
  borderColor,
  variantType = 'default',
  id,
  fontSize = 'md',
  disabled = false,
}: FormSelectProps) {
  const collection = createListCollection({ items });
  const selected = value ? [value] : [];

  const variantStyles = {
    default: {
      bg: bg || 'layoutBg.500',
      border: border || '1px solid',
      borderColor: borderColor || 'gray.200',
    },
    filter: {
      bg: bg || 'paginationBg.500',
      border: 'none',
      borderColor: 'transparent',
    },
  };

  const style = variantStyles[variantType];

  return (
    <Select.Root
      id={id}
      collection={collection}
      value={selected}
      w={width}
      fontSize={fontSize}
      fontWeight={fontWeight}
      onValueChange={e => onChange?.(e.value[0])}
      disabled={disabled}
    >
      <Select.Trigger asChild>
        <Button
          size={triggerSize}
          bg={style.bg}
          border={style.border}
          borderColor={style.borderColor}
          px={2}
          rounded="md"
          h={height}
          minH={height}
          disabled={disabled}
        >
          <Select.ValueText placeholder={placeholder ?? 'Select'} />
          <Select.Indicator />
        </Button>
      </Select.Trigger>
      <Select.Positioner zIndex={30}>
        <Select.Content bg="white" borderRadius="lg" boxShadow="md">
          {collection.items.map(item => (
            <Select.Item
              key={item.value}
              item={item}
              fontSize={fontSize}
              _hover={{ bg: 'primary.200' }}
              _highlighted={{ bg: 'primary.200' }}
              _selected={{ bg: 'primary.500', color: 'white' }}
            >
              {item.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  );
}
