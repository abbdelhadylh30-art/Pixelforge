export const metadata = {
  title: 'PixelForge - Landing Page Audit & Optimization Tool',
  description: 'Import any landing page, get an instant quality score, find the top fixes, and download the improved version.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
