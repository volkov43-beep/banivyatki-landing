import ProjectCard from './projects/ProjectCard.jsx'
import { PROJECTS, PROJECTS_TITLE, PROJECTS_SUBTITLE, PROJECTS_NOTE } from '../data/projects.js'
import { requestCalc } from '../lib/calc.js'
import { track } from '../lib/track.js'

/**
 * Экран «Проекты» (#projects) — второй экран, сразу после первого: шесть
 * базовых комплектаций на surface, заголовок и подзаголовок по центру.
 * От 1024 px три в ряд, ниже две (и на телефоне тоже две: тексты короткие).
 * Кнопка «Рассчитать» — цель project_card_click с названием карточки и
 * requestCalc(season, cardId) из lib/calc.js: калькулятор переключается на
 * «Себе», ставит сезон и размер и прокручивает к сетке карточек.
 * Под сеткой строка про опции (PROJECTS_NOTE, muted, по центру).
 */
export default function SectionProjects() {
  function calc(project) {
    track('project_card_click', { name: project.name })
    requestCalc(project.season, project.cardId)
  }

  return (
    <section id="projects" aria-labelledby="projects-title" className="bg-surface py-section-y text-ink md:py-section-y-lg">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <h2 id="projects-title" className="text-center text-heading">
          {PROJECTS_TITLE}
        </h2>
        <p className="mx-auto mt-4 max-w-measure text-center text-lead">{PROJECTS_SUBTITLE}</p>

        <ul className="mt-12 grid list-none grid-cols-2 gap-x-4 gap-y-8 p-0 md:mt-16 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-10">
          {PROJECTS.map((project) => (
            <ProjectCard key={project.id} project={project} onCalc={calc} />
          ))}
        </ul>

        <p className="mx-auto mt-10 max-w-measure text-center text-[15px] leading-[1.45] text-muted md:mt-12">
          {PROJECTS_NOTE}
        </p>
      </div>
    </section>
  )
}
