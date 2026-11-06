import { Manifesto } from './Manifesto'
import { Formats } from './Formats'
import { Founders } from './Founders'
import { Numbers } from './Numbers'
import { ProofsPreview } from './ProofsPreview'
import { HowItWorks } from './HowItWorks'
import { CommunityPreview } from './CommunityPreview'
import { FeaturedCourses, HomeFaq, Testimonials } from './HomeTail'
import { LobbyNight } from '../community/LobbyNight'
import { CtaBand } from '../Section'

/** Home sotto l'hero: caricata subito dopo il primo render, in un chunk separato. */
export default function HomeRest() {
  return (
    <>
      <Manifesto />
      <Formats />
      <Founders />
      <Numbers />
      <ProofsPreview />
      <HowItWorks />
      <CommunityPreview />
      <LobbyNight />
      <FeaturedCourses />
      <Testimonials />
      <HomeFaq />
      <CtaBand />
    </>
  )
}
