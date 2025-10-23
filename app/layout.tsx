import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Voice Tutor',
  description: 'Personalized educational tutoring through voice conversations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
