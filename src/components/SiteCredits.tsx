import { Github } from 'lucide-react'
import packageJson from '../../package.json'

export const GITHUB_REPO_URL = 'https://github.com/mccoy88f/lospollios'

export function SiteCredits({
  variant = 'default',
  showVersion = true,
  className = '',
}: {
  variant?: 'default' | 'compact'
  showVersion?: boolean
  className?: string
}) {
  const textClass =
    variant === 'compact'
      ? 'text-[clamp(0.5rem,1.6vw,0.6875rem)] text-slate-400'
      : 'text-sm text-gray-500 dark:text-neutral-400'

  const iconClass = variant === 'compact' ? 'w-3.5 h-3.5' : 'w-4 h-4'

  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 ${className}`}>
      <p className={textClass}>
        <span className={variant === 'default' ? 'font-medium text-gray-700 dark:text-white' : ''}>
          LosPollios
        </span>
        {variant === 'default' ? (
          <>
            <span className="mx-1">·</span>
            Creato da Antonello Migliorelli
          </>
        ) : (
          <> · Antonello Migliorelli</>
        )}
        {showVersion && (
          <>
            {' '}
            · V{packageJson.version}
          </>
        )}
      </p>
      <a
        href={GITHUB_REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white transition-colors ${variant === 'compact' ? 'p-0.5' : 'p-1'}`}
        aria-label="Repository GitHub LosPollios"
        title="GitHub"
      >
        <Github className={iconClass} aria-hidden />
      </a>
    </div>
  )
}
