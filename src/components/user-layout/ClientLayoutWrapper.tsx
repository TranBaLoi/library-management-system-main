'use client';

import { ROUTES } from '@/constants';
import { useMe } from '@/lib/hooks';
import { IoHeartOutline, IoHomeOutline, IoSearchOutline } from 'react-icons/io5';
import { RiBookShelfLine } from 'react-icons/ri';
import { ConditionalLayout } from './ConditionalLayout';

type ClientLayoutWrapperProps = {
  children: React.ReactNode;
};

export function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const { data: user } = useMe();

  // Sidebar menu items - defined in Client Component
  const sidebarItems = [
    {
      label: 'Home',
      href: ROUTES.HOME,
      icon: IoHomeOutline,
    },
    {
      label: 'Search',
      href: ROUTES.SEARCH,
      icon: IoSearchOutline,
    },
    ...(user?.role === 'READER'
      ? [
          {
            label: 'Favorites',
            href: ROUTES.FAVORITE,
            icon: IoHeartOutline,
          },
          {
            label: 'My Shelf',
            href: '',
            icon: RiBookShelfLine,
            children: [
              {
                label: 'My Ebooks',
                href: ROUTES.MY_EBOOKS,
              },
              {
                label: 'Borrow Requests',
                href: ROUTES.MY_BORROW_REQUESTS,
              },
              {
                label: 'Borrow Records',
                href: ROUTES.MY_BORROW_RECORDS,
              },
              {
                label: 'Violations',
                href: ROUTES.MY_VIOLATIONS,
              },
            ],
          },
        ]
      : []),
  ];

  return <ConditionalLayout sidebarItems={sidebarItems}>{children}</ConditionalLayout>;
}
