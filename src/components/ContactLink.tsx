'use client'

export function ContactLink({ className }: { className?: string }) {
  const handleClick = () => {
    const user = 'frederic'
    const domain = 'fornini.com'
    window.location.href = `mailto:${user}@${domain}`
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`cursor-pointer leading-none transition-opacity hover:opacity-70 ${className ?? ''}`}
      aria-label="Envoyer un email à Frédéric Fornini"
    >
      contact
    </button>
  )
}
