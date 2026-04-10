import { Stack } from '@chakra-ui/react';
import { Button } from '@/components';

interface FormButtonsProps {
  submitLabel: string;
  cancelLabel: string;
  isSubmitting: boolean;
  onCancel: () => void;
}

export function FormButtons({
  submitLabel,
  cancelLabel,
  isSubmitting,
  onCancel,
}: FormButtonsProps) {
  return (
    <Stack direction="row" gap={4} mt={2} justifyContent="flex-end">
      <Button type="submit" variantType="primary" loading={isSubmitting} label={submitLabel} />
      <Button
        type="button"
        variantType="secondary"
        onClick={onCancel}
        disabled={isSubmitting}
        label={cancelLabel}
      />
    </Stack>
  );
}
