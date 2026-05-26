import { NextRequest } from 'next/server'
import { sseSubscribe } from '@/lib/sse'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const electionId = Number(id)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const ping = () => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'ping' })}\n\n`))
      }

      ping()

      const sub = sseSubscribe(electionId, data => {
        const msg = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(msg))
      })

      // Ping ogni 25s: proxy timeout + rilevamento connessione lato client
      const timer = setInterval(() => {
        try {
          ping()
        } catch {
          clearInterval(timer)
          sub.close()
        }
      }, 25000)

      // Cleanup on close
      _req.signal.addEventListener('abort', () => {
        clearInterval(timer)
        sub.close()
        try { controller.close() } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
