import { randomUUID } from 'crypto'
import type { NextRequest } from 'next/server'
import prisma from '@/lib/db'

const SESSION_MS = 24 * 60 * 60 * 1000
const TOUCH_INTERVAL_MS = 2 * 60 * 1000

function clientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return req.headers.get('x-real-ip')
}

function clientUserAgent(req: NextRequest): string | null {
  const ua = req.headers.get('user-agent')
  if (!ua) return null
  return ua.length > 500 ? ua.slice(0, 500) : ua
}

export async function createUserSession(userId: number, req: NextRequest): Promise<string> {
  const id = randomUUID()
  const now = new Date()
  await prisma.userSession.create({
    data: {
      id,
      userId,
      expiresAt: new Date(now.getTime() + SESSION_MS),
      lastSeenAt: now,
      userAgent: clientUserAgent(req),
      ipAddress: clientIp(req),
    },
  })
  return id
}

export async function isUserSessionActive(sessionId: string): Promise<boolean> {
  const row = await prisma.userSession.findUnique({
    where: { id: sessionId },
    select: { revokedAt: true, expiresAt: true },
  })
  if (!row || row.revokedAt) return false
  return row.expiresAt > new Date()
}

export async function touchUserSession(sessionId: string): Promise<void> {
  const row = await prisma.userSession.findUnique({
    where: { id: sessionId },
    select: { lastSeenAt: true, revokedAt: true },
  })
  if (!row || row.revokedAt) return
  const age = Date.now() - row.lastSeenAt.getTime()
  if (age < TOUCH_INTERVAL_MS) return
  await prisma.userSession.update({
    where: { id: sessionId },
    data: { lastSeenAt: new Date() },
  })
}

export async function revokeUserSession(sessionId: string): Promise<boolean> {
  const row = await prisma.userSession.findUnique({ where: { id: sessionId } })
  if (!row || row.revokedAt) return false
  await prisma.userSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  })
  return true
}

export async function revokeUserSessionForUser(userId: number, sessionId: string): Promise<boolean> {
  const row = await prisma.userSession.findFirst({
    where: { id: sessionId, userId },
  })
  if (!row || row.revokedAt) return false
  await prisma.userSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  })
  return true
}

export async function listActiveUserSessions() {
  return prisma.userSession.findMany({
    where: {
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          election: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { lastSeenAt: 'desc' },
  })
}
