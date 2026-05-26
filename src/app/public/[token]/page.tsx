import PublicBoardClient from './PublicBoardClient'

type Props = { params: Promise<{ token: string }> }

export const metadata = {
  title: 'Tabellone scrutinio',
  robots: 'noindex',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function PublicBoardPage({ params }: Props) {
  const { token } = await params
  return <PublicBoardClient token={token} />
}
