'use client';

import { UserLayout } from '@/components/user-layout';
import { ROUTES } from '@/constants';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

type ConditionalLayoutProps = {
  children: ReactNode;
  sidebarItems: Array<{
    label: string;
    href: string;
    icon?: React.ComponentType;
    children?: Array<{
      label: string;
      href: string;
    }>;
  }>;
};

export function ConditionalLayout({ children, sidebarItems }: ConditionalLayoutProps) {
  const pathname = usePathname();

  // Check if the route is a dashboard route or an auth route
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isAuthRoute = Object.values(ROUTES.AUTH).includes(
    pathname as (typeof ROUTES.AUTH)[keyof typeof ROUTES.AUTH]
  );

  if (isDashboardRoute || isAuthRoute) {
    return <>{children}</>;
  }

  return <UserLayout sidebarItems={sidebarItems}>{children}</UserLayout>;
}
