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
  return (
    <div className="relative">
      <Header />
      <main>
        <SectionHero />
        <CatalogSection />
        <SectionWorks />
        <SectionReviews />
        <QuizSection />
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
