import { client } from '@/sanity/lib/client'
import { SLIDESHOW_QUERY } from '@/sanity/lib/queries'
import { Slideshow } from '@/components/Slideshow'

export default async function HomePage() {
  const slideshow = await client.fetch(SLIDESHOW_QUERY)

  if (!slideshow || !slideshow.slides || slideshow.slides.length === 0) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/50">Aucun slideshow configuré</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black">
      <Slideshow
        slides={slideshow.slides}
        defaultDuration={slideshow.defaultDuration || 5000}
      />
    </main>
  )
}
