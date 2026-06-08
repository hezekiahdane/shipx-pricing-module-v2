import '@/app/globals.css';

// Root layout — required by Next.js to provide <html> and <body>.
// All nested layouts (locale, admin) inherit from this.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-body">{children}</body>
    </html>
  );
}
