import { redirect } from 'next/navigation'

export default function HistoricalAddRedirectPage() {
  redirect('/admin/historical?mode=add')
}

