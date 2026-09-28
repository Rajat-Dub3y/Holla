import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/components/auth-provider';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  metadataBase: new URL('https://holla.app'),
  title: 'Holla — Your AI Dating Conversation Coach',
  description:
    'Not a reply generator. A personalized coach that sits beside you through real conversations — reads what she said, suggests your next move, and helps you actually get dates.',
  openGraph: {
    title: 'Holla — Your AI Dating Conversation Coach',
    description:
      'Not a reply generator. A personalized coach that sits beside you through real conversations.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Holla — Your AI Dating Conversation Coach',
    description:
      'Not a reply generator. A personalized coach that sits beside you through real conversations.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-cream font-sans text-charcoal antialiased">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
