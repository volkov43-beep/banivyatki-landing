/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--color-ink)',
        surface: 'var(--color-surface)',
        accent: 'var(--color-accent)',
        muted: 'var(--color-muted)',
        alert: 'var(--color-alert)',
      },
      fontFamily: {
        sans: 'var(--font-family-sans)',
      },
      fontSize: {
        heading: ['var(--font-size-heading)', { lineHeight: 'var(--line-height-heading)', fontWeight: '700' }],
        lead: ['var(--font-size-lead)', { lineHeight: 'var(--line-height-lead)', fontWeight: '400' }],
        title: ['var(--font-size-title)', { lineHeight: 'var(--line-height-title)', fontWeight: '700' }],
        body: ['var(--font-size-body)', { lineHeight: 'var(--line-height-body)', fontWeight: '400' }],
        label: ['var(--font-size-label)', { lineHeight: 'var(--line-height-label)', fontWeight: '400' }],
      },
      maxWidth: {
        container: 'var(--container-max)',
        measure: 'var(--measure)',
      },
      spacing: {
        gutter: 'var(--gutter-mobile)',
        'gutter-lg': 'var(--gutter-desktop)',
        'section-y': 'var(--section-y-mobile)',
        'section-y-lg': 'var(--section-y-desktop)',
      },
    },
  },
  plugins: [],
}
