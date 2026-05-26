export default function PublicBoardLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-full w-full overflow-hidden bg-slate-50 dark:bg-neutral-950">{children}</div>
}
