const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin'
  const passwordPlain = process.env.ADMIN_PASSWORD || 'admin123'
  const name = process.env.ADMIN_NAME || 'Amministratore'

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    console.log(`[bootstrap-admin] Utente "${username}" già presente, nessuna modifica.`)
    return
  }

  const password = await bcrypt.hash(passwordPlain, 10)
  await prisma.user.create({
    data: {
      username,
      password,
      name,
      role: 'admin',
    },
  })

  console.log(`[bootstrap-admin] Creato admin iniziale: ${username}`)
}

main()
  .catch((err) => {
    console.error('[bootstrap-admin] Errore creazione admin:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
