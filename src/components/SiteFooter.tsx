import { SiteCredits } from '@/components/SiteCredits'

export function SiteFooter() {
  return (
    <footer className="shrink-0 border-t border-gray-200 dark:border-neutral-800 bg-gray-50/80 dark:bg-neutral-950 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <SiteCredits />
      </div>
    </footer>
  )
}
