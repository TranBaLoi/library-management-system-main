import { Box } from '@chakra-ui/react';

interface AvatarProps {
  size?: 'sm' | 'md' | 'lg';
  src?: string;
  [key: string]: unknown;
}

export function Avatar({ size = 'md', src, ...props }: AvatarProps) {
  const sizeMap = {
    sm: '32px',
    md: '40px',
    lg: '48px',
  };

  return (
    <Box
      width={sizeMap[size]}
      height={sizeMap[size]}
      borderRadius="full"
      bg="gray.200"
      backgroundImage={src ? `url(${src})` : undefined}
      backgroundSize="cover"
      backgroundPosition="center"
      {...props}
    />
  );
}
