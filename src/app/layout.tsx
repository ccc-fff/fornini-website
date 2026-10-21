import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const jost = localFont({
  src: '../../public/fonts/Jost-400-Book.ttf',
  display: 'swap',
  variable: '--font-jost',
  weight: '400',
})

export const metadata: Metadata = {
  title: 'Frédéric Fornini — Creative and Art Direction',
  description: 'Frédéric Fornini — Creative and Art Direction',
  authors: [{ name: 'Frédéric Fornini' }],
  openGraph: {
    title: 'Frédéric Fornini — Creative and Art Direction',
    description: 'Frédéric Fornini — Creative and Art Direction',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={jost.variable}>
      <head>
        {/* Inter variable : police de la phrase Text Fusion (le moteur la demande par son nom « Inter ») */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased bg-[#141414] text-white">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
