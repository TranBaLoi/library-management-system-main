import {
  Provider,
  QueryProvider,
  SessionExpiredHandler,
  SocketProvider,
  Toaster,
} from '@/components';
import { ClientLayoutWrapper } from '@/components/user-layout';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter-sans',
  subsets: ['latin'],
});

const interMono = Inter({
  variable: '--font-inter-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Libra',
  description: 'Library Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${interMono.variable} antialiased`}>
        <QueryProvider>
          <Provider>
            <SocketProvider>
              <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
              <Toaster />
              <SessionExpiredHandler />
            </SocketProvider>
          </Provider>
        </QueryProvider>
      </body>
    </html>
  );
}
