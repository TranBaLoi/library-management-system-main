'use client';

import { Layout, Sidebar } from '@/components';
import { ROUTES } from '@/constants';
import { ReactNode } from 'react';
import { HiOutlineScale } from 'react-icons/hi';
import { LuBook, LuClipboardList, LuTags, LuUserPen, LuUsers } from 'react-icons/lu';
import { RiFileWarningLine } from 'react-icons/ri';
import { SlGrid } from 'react-icons/sl';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const sidebarItems = [
    { label: 'Dashboard', href: ROUTES.DASHBOARD.HOME, icon: SlGrid },
    {
      label: 'Books',
      href: '',
      icon: LuBook,
      children: [
        { label: 'All Books', href: ROUTES.DASHBOARD.BOOKS },
        { label: 'Add Book', href: ROUTES.DASHBOARD.BOOKS_ADD },
        { label: 'Book Copies', href: ROUTES.DASHBOARD.BOOKS_COPIES },
        { label: 'Add Book Copy', href: ROUTES.DASHBOARD.BOOKS_COPIES_ADD },
        { label: 'Book Editions', href: ROUTES.DASHBOARD.BOOKS_EDITIONS },
        { label: 'Add Book Edition', href: ROUTES.DASHBOARD.BOOKS_EDITIONS_ADD },
      ],
    },
    {
      label: 'Authors',
      href: '',
      icon: LuUserPen,
      children: [
        { label: 'All Authors', href: ROUTES.DASHBOARD.AUTHORS },
        { label: 'Add Author', href: ROUTES.DASHBOARD.AUTHORS_ADD },
      ],
    },
    {
      label: 'Categories',
      href: '',
      icon: LuTags,
      children: [
        { label: 'All Categories', href: ROUTES.DASHBOARD.CATEGORIES },
        { label: 'Add Category', href: ROUTES.DASHBOARD.CATEGORIES_ADD },
      ],
    },
    {
      label: 'Users',
      href: '',
      icon: LuUsers,
      children: [
        { label: 'All Users', href: ROUTES.DASHBOARD.USERS },
        { label: 'Add User', href: ROUTES.DASHBOARD.USERS_ADD },
      ],
    },
    {
      label: 'Borrowing',
      href: '',
      icon: LuClipboardList,
      children: [
        { label: 'Borrow Requests', href: ROUTES.DASHBOARD.BORROW_REQUESTS },
        { label: 'Borrow Records', href: ROUTES.DASHBOARD.BORROW_RECORDS },
        { label: 'Add Borrow Record', href: ROUTES.DASHBOARD.BORROW_RECORDS_ADD },
      ],
    },
    {
      label: 'Policies',
      href: '',
      icon: HiOutlineScale,
      children: [
        { label: 'All Policies', href: ROUTES.DASHBOARD.POLICIES },
        { label: 'Add Policy', href: ROUTES.DASHBOARD.POLICIES_ADD },
      ],
    },
    {
      label: 'Violations',
      href: ROUTES.DASHBOARD.VIOLATIONS,
      icon: RiFileWarningLine,
    },
  ];

  return (
    <Layout sidebar={<Sidebar items={sidebarItems} showProfileInSettings={true} />}>
      {children}
    </Layout>
  );
}
