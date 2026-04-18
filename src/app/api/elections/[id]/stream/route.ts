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
      // Send initial keepalive
      controller.enqueue(encoder.encode(': keepalive\n\n'))

      const unsubscribe = sseSubscribe(electionId, (data) => {
        const msg = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(msg))
      })

      // Keepalive every 25s to prevent proxy timeouts
      const timer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        } catch {
          clearInterval(timer)
          unsubscribe()
        }
      }, 25000)

      // Cleanup on close
      _req.signal.addEventListener('abort', () => {
        clearInterval(timer)
        unsubscribe()
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
