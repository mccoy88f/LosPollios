import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'

export function AdminNavCard({
  href,
  icon: Icon,
  title,
  description,
  external,
}: {
  href: string
  icon: LucideIcon
  title: string
  description: string
  external?: boolean
}) {
  return (
    <Link href={href} className="block group h-full">
      <Card className="p-5 h-full hover:border-brand-300 hover:shadow-md transition-all">
        <div className="p-2 w-fit rounded-lg bg-brand-50 dark:bg-neutral-800 text-brand-700 dark:text-brand-300 mb-3">
          <Icon className="w-6 h-6" aria-hidden />
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">
          {title}
        </h3>
        <p className={cn('text-sm text-gray-500 dark:text-neutral-400 mt-1', external && 'text-xs text-brand-600 dark:text-brand-400')}>
          {description}
        </p>
      </Card>
    </Link>
  )
}
