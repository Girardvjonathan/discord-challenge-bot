import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Challenge Bot',
  description: 'Daily push-up challenge tracker',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
