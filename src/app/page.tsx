import { client } from '@/sanity/lib/client'
import { SLIDESHOW_QUERY } from '@/sanity/lib/queries'
import { Slideshow } from '@/components/Slideshow'

export default async function HomePage() {
  const slideshow = await client.fetch(SLIDESHOW_QUERY)

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 p-6 md:p-8 mix-blend-difference">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg md:text-xl font-normal tracking-tight">
            Frédéric Fornini
          </h1>
          <p className="text-sm md:text-base text-white/70">
            Creative Direction & Digital Experiences
          </p>
        </div>
      </header>

      {/* Slideshow */}
      {slideshow?.slides?.length > 0 ? (
        <Slideshow
          slides={slideshow.slides}
          defaultDuration={slideshow.defaultDuration || 5000}
        />
      ) : (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-white/50">Aucun slideshow configuré</p>
        </div>
      )}

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 p-6 md:p-8 mix-blend-difference">
        <div className="flex gap-6 text-sm">
          <a
            href="https://instagram.com/fredericfornini"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-70 transition-opacity"
          >
            Instagram
          </a>
          <a
            href="mailto:frederic@fornini.com"
            className="hover:opacity-70 transition-opacity"
          >
            frederic@fornini.com
          </a>
        </div>
      </footer>
    </main>
  )
}
