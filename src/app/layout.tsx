import type { Metadata } from 'next'
import localFont from 'next/font/local'
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
      <body className="antialiased bg-[#141414] text-white">
        {children}
      </body>
    </html>
  )
}
