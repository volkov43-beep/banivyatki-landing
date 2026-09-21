import Header from './components/Header.jsx'
import SectionHero from './components/SectionHero.jsx'
import SectionComparison from './components/SectionComparison.jsx'
import SectionCalculator from './components/SectionCalculator.jsx'
import SectionInside from './components/SectionInside.jsx'
import SectionProcess from './components/SectionProcess.jsx'
import Footer from './components/Footer.jsx'

export default function App() {
  return (
    <div className="relative">
      <Header />
      <main>
        <SectionHero />
        <SectionComparison />
        <SectionCalculator />
        <SectionInside />
        <SectionProcess />
      </main>
      <Footer />
    </div>
  )
}
