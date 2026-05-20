import Link from 'next/link'

export function BreadcrumbNav({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="text-sm text-gray-500 mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="inline-flex items-center gap-x-2">
          {i > 0 ? <span className="text-gray-300 select-none" aria-hidden>/</span> : null}
          {item.href ? (
            <Link href={item.href} className="text-brand-600 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
