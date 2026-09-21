import Header from './components/Header.jsx'
import SectionHero from './components/SectionHero.jsx'
import SectionComparison from './components/SectionComparison.jsx'
import SectionInside from './components/SectionInside.jsx'

export default function App() {
  return (
    <div className="relative">
      <Header />
      <main>
        <SectionHero />
        <SectionComparison />
        <SectionInside />
      </main>
    </div>
  )
}
