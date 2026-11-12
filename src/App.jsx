import { useMemo, useRef } from 'react'
import Header from './components/Header.jsx'
import SectionHero from './components/SectionHero.jsx'
import CatalogSection from './components/catalog/CatalogSection.jsx'
import SectionWorks from './components/SectionWorks.jsx'
import SectionReviews from './components/SectionReviews.jsx'
import QuizSection from './components/quiz/QuizSection.jsx'
import SectionLocations from './components/SectionLocations.jsx'
import SectionDelivery from './components/SectionDelivery.jsx'
import SectionCalculator from './components/SectionCalculator.jsx'
import SectionBenefits from './components/SectionBenefits.jsx'
import SectionComparison from './components/SectionComparison.jsx'
import SectionInside from './components/SectionInside.jsx'
import SectionProcess from './components/SectionProcess.jsx'
import SectionShowroom from './components/SectionShowroom.jsx'
import SectionFaq from './components/SectionFaq.jsx'
import SectionFinal from './components/SectionFinal.jsx'
import Footer from './components/Footer.jsx'
import { REGIONS } from './data/regions.js'
import { getRegionalPrices } from './data/pricing.js'

export default function App({ region = REGIONS.kirov }) {
  const prices = useMemo(() => getRegionalPrices(region.priceAdjustment), [region.priceAdjustment])
  const catalogRef = useRef(null)
  const quizRef = useRef(null)
  return (
    <div className="relative">
      <Header />
      <main>
        <SectionHero region={region} minimum={prices.minimum} onCatalogOpen={(opener) => catalogRef.current?.openCatalog(opener)} />
        <CatalogSection ref={catalogRef} onCalculate={(model, opener) => quizRef.current?.startNew(model.crmCode, opener)} />
        <SectionWorks
          works={prices.works}
          minimum={prices.minimum}
          priceLabel={region.workPriceLabel}
          priceNote={region.workPriceNote}
          installationCaption={region.delivery?.installationCaption}
        />
        <SectionReviews />
        <QuizSection key={region.quiz?.storageKey} ref={quizRef} config={region.quiz} />
        <SectionLocations settings={region.map} />
        {region.delivery && <SectionDelivery delivery={region.delivery} />}
        <SectionCalculator cardsBySeason={prices.cards} delivery={region.delivery} />
        <SectionBenefits timeBenefit={region.delivery?.timeBenefit} />
        <SectionComparison />
        <SectionInside />
        <SectionProcess installationStep={region.delivery?.installationStep} />
        <SectionShowroom />
        <SectionFaq answers={region.faqAnswers?.(prices.minimum)} />
        <SectionFinal />
      </main>
      <Footer />
    </div>
  )
}
