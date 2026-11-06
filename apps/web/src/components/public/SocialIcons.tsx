import type { ReactNode } from 'react'
import { BRAND } from '@/config/brand'
import { cn } from '@/lib/cn'

// Glifi social disegnati a mano (lucide v1 non include più i marchi).
const glyphs: Record<keyof typeof BRAND.social, { label: string; path: ReactNode }> = {
  youtube: {
    label: 'YouTube',
    path: (
      <>
        <rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" />
      </>
    ),
  },
  twitch: {
    label: 'Twitch',
    path: (
      <>
        <path d="M4.5 3.5h15v10.5l-4 4h-3.5l-3 3v-3h-4.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M11 8v4M15 8v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
  instagram: {
    label: 'Instagram',
    path: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.9" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
      </>
    ),
  },
  tiktok: {
    label: 'TikTok',
    path: (
      <path
        d="M14 3.5v11.2a3.7 3.7 0 1 1-3.7-3.7M14 3.5c.4 2.6 2.2 4.4 5 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    ),
  },
  x: {
    label: 'X',
    path: <path d="M4.5 4h4.2l10.8 16h-4.2zM19.2 4l-6 6.8M4.8 20l6-6.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
  },
}

export function SocialLinks({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-1', className)}>
      {(Object.keys(glyphs) as (keyof typeof glyphs)[]).map((k) => (
        <li key={k}>
          <a
            href={BRAND.social[k]}
            className="grid h-11 w-11 place-items-center rounded-full text-muted transition-colors hover:text-accent"
            aria-label={`${BRAND.name} su ${glyphs[k].label}`}
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              {glyphs[k].path}
            </svg>
          </a>
        </li>
      ))}
    </ul>
  )
}
