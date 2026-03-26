export const metadata = {
  title: '',
  description: '',
  // Browser tab + Apple “Add to Home Screen” icon (180×180 recommended; any PNG scales)
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    shortcut: '/favicon.png',
    apple: [{ url: '/favicon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hideDevImages = process.env.HIDE_DEV_IMAGES === 'true';
  return (
    <html lang="en" className={hideDevImages ? 'hide-dev-images' : undefined}>
      <head>
        <title>{metadata.title}</title>
        {/* iOS home screen: Safari prefers a 180×180 apple-touch-icon */}
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100..900;1,100..900&family=Space+Grotesk:wght@300..700&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0, viewport-fit=cover"
        />
        <script src="https://accounts.google.com/gsi/client" async defer />
      </head>
      {children}
    </html>
  );
}
