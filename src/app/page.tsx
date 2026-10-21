import Script from 'next/script'
import { ContactLink } from '@/components/ContactLink'

const PORTFOLIO_PDF = 'https://drive.google.com/open?id=1cVxmqkaTLVh6J2QMD4Es8d3pmSUU8vJk&usp=drive_fs'

// Phrase animée Text Fusion (WebGPU) plein écran + panneau « Playground » ; maquette Figma Fornini.com 540:25 / 769:396.
// Mise en page des liens et du panneau : public/tf/panel.css ; comportement : public/tf/site.js.
export default function HomePage() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-black">
      <link rel="stylesheet" href="/tf/panel.css" precedence="default" />
      <canvas id="view" />
      <div
        id="tf-fallback"
        className="absolute inset-0 hidden items-center justify-center whitespace-pre-line px-4 text-center font-[Inter] text-[clamp(32px,8vw,120px)] font-light uppercase leading-[1.05] text-white"
      />
      <nav className="site-links">
        <ContactLink />
        <a href={PORTFOLIO_PDF} target="_blank" rel="noopener noreferrer">
          Portfolio
        </a>
      </nav>
      <div id="panel" />
      <Script src="/tf/site.js" type="module" strategy="afterInteractive" />
    </main>
  )
}
