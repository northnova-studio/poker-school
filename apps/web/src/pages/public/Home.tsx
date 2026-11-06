import { Suspense, lazy } from 'react'
import { BRAND } from '@/config/brand'
import { Hero } from '@/components/public/home/Hero'

// Tutto ciò che sta sotto l'hero è in un chunk separato: il JS iniziale resta leggero.
const HomeRest = lazy(() => import('@/components/public/home/HomeRest'))

export default function Home() {
  return (
    <>
      <title>{`${BRAND.name} — Scuola di poker: MTT, Spin & Go, Cash game`}</title>
      <Hero />
      <Suspense fallback={<div className="min-h-screen bg-bg" aria-hidden />}>
        <HomeRest />
      </Suspense>
    </>
  )
}
