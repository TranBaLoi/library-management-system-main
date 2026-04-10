'use client';

import { Button } from '@/components';
import { Dialog as ChakraDialog, CloseButton, Portal } from '@chakra-ui/react';
import React from 'react';

export interface DialogButton {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  type?: 'button' | 'submit' | 'reset';
}

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
  buttons?: DialogButton[];
  showCloseButton?: boolean;
  width?: string | number;
  maxW?: string | number;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  content,
  buttons = [],
  showCloseButton = true,
  width,
  maxW,
}: DialogProps) {
  return (
    <ChakraDialog.Root open={isOpen} placement="center" onOpenChange={e => !e.open && onClose()}>
      <Portal>
        <ChakraDialog.Backdrop bg="blackAlpha.600" />
        <ChakraDialog.Positioner>
          <ChakraDialog.Content bg="white" width={width} maxW={maxW}>
            <ChakraDialog.Header>
              <ChakraDialog.Title fontSize="xl" fontWeight="bold">
                {title}
              </ChakraDialog.Title>
              {showCloseButton && (
                <ChakraDialog.CloseTrigger asChild>
                  <CloseButton size="sm" />
                </ChakraDialog.CloseTrigger>
              )}
            </ChakraDialog.Header>

            <ChakraDialog.Body fontSize="md">{content}</ChakraDialog.Body>

            {buttons.length > 0 && (
              <ChakraDialog.Footer>
                {buttons.map((button, index) => (
                  <Button
                    key={index}
                    label={button.label}
                    variantType={button.variant || 'primary'}
                    onClick={button.onClick}
                    type={button.type || 'button'}
                    mr={index < buttons.length - 1 ? 2 : 0}
                    fontSize="md"
                  />
                ))}
              </ChakraDialog.Footer>
            )}
          </ChakraDialog.Content>
        </ChakraDialog.Positioner>
      </Portal>
    </ChakraDialog.Root>
  );
}
