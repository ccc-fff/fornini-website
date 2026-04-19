import { ContactLink } from '@/components/ContactLink'

export default function HomePage() {
  return (
    <main className="flex min-h-dvh w-full items-center justify-center px-3 py-9 md:p-9">
      <div className="flex flex-col items-center gap-9">
        <div className="flex flex-col items-center gap-[18px] text-center leading-none text-white text-[24px] md:text-[46px]">
          <p>Frédéric Fornini</p>
          <p>Creative and art direction</p>
        </div>
        <ContactLink className="text-[24px] md:text-[46px] text-white" />
      </div>
    </main>
  )
}
