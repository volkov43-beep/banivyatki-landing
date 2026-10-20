import { useRef } from 'react'
import Header from './components/Header.jsx'
import SectionHero from './components/SectionHero.jsx'
import CatalogSection from './components/catalog/CatalogSection.jsx'
import SectionWorks from './components/SectionWorks.jsx'
import SectionReviews from './components/SectionReviews.jsx'
import QuizSection from './components/quiz/QuizSection.jsx'
import SectionLocations from './components/SectionLocations.jsx'
import SectionCalculator from './components/SectionCalculator.jsx'
import SectionBenefits from './components/SectionBenefits.jsx'
import SectionComparison from './components/SectionComparison.jsx'
import SectionInside from './components/SectionInside.jsx'
import SectionProcess from './components/SectionProcess.jsx'
import SectionShowroom from './components/SectionShowroom.jsx'
import SectionFaq from './components/SectionFaq.jsx'
import SectionFinal from './components/SectionFinal.jsx'
import Footer from './components/Footer.jsx'

export default function App() {
  const catalogRef = useRef(null)
  const quizRef = useRef(null)
  return (
    <div className="relative">
      <Header />
      <main>
        <SectionHero onCatalogOpen={(opener) => catalogRef.current?.openCatalog(opener)} />
        <CatalogSection ref={catalogRef} onCalculate={(model, opener) => quizRef.current?.startNew(model.crmCode, opener)} />
        <SectionWorks />
        <SectionReviews />
        <QuizSection ref={quizRef} />
        <SectionLocations />
        <SectionCalculator />
        <SectionBenefits />
        <SectionComparison />
        <SectionInside />
        <SectionProcess />
        <SectionShowroom />
        <SectionFaq />
        <SectionFinal />
      </main>
      <Footer />
    </div>
  )
}
