import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fornini',
  description: 'Direction Créative & Direction Artistique',
  authors: [{ name: 'Fornini' }],
  openGraph: {
    title: 'Fornini',
    description: 'Direction Créative & Direction Artistique',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://cdn.sanity.io" />
        <link rel="preconnect" href="https://player.vimeo.com" />
      </head>
      <body className="antialiased bg-black text-white overflow-hidden">
        {children}
      </body>
    </html>
  )
}
