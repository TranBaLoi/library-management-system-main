'use client';

import { Button as ChakraButton, ButtonProps as ChakraButtonProps, Icon } from '@chakra-ui/react';
import Link from 'next/link';
import React from 'react';

interface ButtonProps extends Omit<ChakraButtonProps, 'children'> {
  href?: string;
  label?: string;
  icon?: React.ElementType;
  rightIcon?: React.ElementType;
  isActive?: boolean;
  onClick?: () => void;
  variantType?:
    | 'primary'
    | 'primaryOutline'
    | 'secondary'
    | 'sidebar'
    | 'sidebar-submenu'
    | 'tertiary'
    | 'ghost';
}

export function Button({
  href,
  label,
  icon,
  rightIcon,
  isActive,
  onClick,
  variantType = 'primary',
  ...buttonProps
}: ButtonProps) {
  const variantStyles = {
    primary: {
      w: 'fit-content',
      bg: 'primary.500',
      color: 'white',
      justifyContent: 'center',
      borderColor: 'primary.500',
      hover: { bg: 'white', color: 'primary.500' },
      active: {},
    },
    primaryOutline: {
      w: 'fit-content',
      bg: 'transparent',
      color: 'primary.500',
      justifyContent: 'center',
      borderColor: 'primary.500',
      hover: { bg: 'primary.500', color: 'white' },
      active: {},
    },
    secondary: {
      w: 'fit-content',
      bg: 'secondary.500',
      color: 'white',
      justifyContent: 'center',
      borderColor: 'secondary.500',
      hover: { bg: 'white', color: 'secondary.500' },
      active: {},
    },
    sidebar: {
      w: 'full',
      bg: isActive ? 'primary.500' : 'transparent',
      color: isActive ? 'white' : 'secondaryText.500',
      justifyContent: 'flex-start',
      borderColor: 'transparent',
      hover: { bg: isActive ? 'primary.500' : 'primary.200' },
      active: { bg: 'primary.200' },
    },
    'sidebar-submenu': {
      w: 'full',
      bg: isActive ? 'primary.500' : 'transparent',
      color: isActive ? 'white' : 'secondaryText.500',
      justifyContent: 'flex-start',
      borderColor: 'transparent',
      hover: { bg: isActive ? 'primary.500' : 'primary.200' },
      active: { bg: 'primary.200' },
    },
    tertiary: {
      w: 'fit-content',
      bg: 'paginationBg.500',
      color: 'primaryText.500',
      justifyContent: 'center',
      borderColor: 'transparent',
      hover: { bg: 'primary.200', color: 'primaryText.500' },
      active: {},
    },
    ghost: {
      w: 'fit-content',
      bg: 'white',
      color: 'primaryText.500',
      justifyContent: 'center',
      borderColor: 'gray.200',
      hover: { bg: 'primary.200', color: 'primaryText.500' },
      active: {},
    },
  };

  const style = variantStyles[variantType];

  const content = (
    <>
      {icon && <Icon as={icon} boxSize={5} />}
      {label}
      {rightIcon && <Icon as={rightIcon} boxSize={4} ml="auto" />}
    </>
  );

  return (
    <ChakraButton
      variant="ghost"
      justifyContent="flex-start"
      w={style.w}
      h="50px"
      bg={style.bg}
      color={style.color}
      border="1px solid"
      borderColor={style.borderColor}
      _hover={style.hover}
      _active={style.active}
      px={4}
      rounded="lg"
      onClick={href ? undefined : onClick}
      {...buttonProps}
    >
      {href ? (
        <Link
          href={href}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: style.justifyContent,
            gap: '12px',
          }}
        >
          {content}
        </Link>
      ) : (
        <span
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            justifyContent: style.justifyContent,
          }}
        >
          {content}
        </span>
      )}
    </ChakraButton>
  );
}
