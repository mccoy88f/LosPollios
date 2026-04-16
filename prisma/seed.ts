import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      name: 'Amministratore',
      role: 'admin',
    },
  })

  // Demo election
  const election = await prisma.election.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Elezioni Comunali 2025',
      commune: 'Comune di Esempio',
      date: new Date('2025-05-15'),
      type: 'large',
      totalSeats: 32,
      threshold: 3.0,
      status: 'active',
    },
  })

  // Lists
  const lists = [
    { name: 'Lista Civica Progresso', shortName: 'LCP', color: '#2563eb', candidateMayor: 'Mario Rossi', coalition: 'Centro-Sinistra', order: 1 },
    { name: 'Unione Democratica', shortName: 'UD',  color: '#16a34a', candidateMayor: 'Mario Rossi', coalition: 'Centro-Sinistra', order: 2 },
    { name: 'Futuro Insieme',        shortName: 'FI', color: '#dc2626', candidateMayor: 'Giulia Bianchi', coalition: 'Centro-Destra',  order: 3 },
    { name: 'Partito Popolare',      shortName: 'PP', color: '#ea580c', candidateMayor: 'Giulia Bianchi', coalition: 'Centro-Destra',  order: 4 },
    { name: 'Movimento Civico',      shortName: 'MC', color: '#9333ea', candidateMayor: 'Luca Verdi',     coalition: 'Lista Verdi',    order: 5 },
  ]

  for (const l of lists) {
    await prisma.electionList.upsert({
      where: { id: l.order },
      update: {},
      create: { ...l, electionId: election.id },
    })
  }

  // Sections (10 demo sections)
  for (let i = 1; i <= 10; i++) {
    await prisma.section.upsert({
      where: { electionId_number: { electionId: election.id, number: i } },
      update: {},
      create: {
        electionId: election.id,
        number: i,
        name: `Sezione ${i}`,
        location: `Via Roma ${i * 10}`,
        theoreticalVoters: 800 + Math.floor(Math.random() * 400),
        order: i,
      },
    })
  }

  // Historical election
  const hist = await prisma.historicalElection.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Elezioni Comunali 2020',
      commune: 'Comune di Esempio',
      year: 2020,
      notes: 'Elezioni precedenti',
    },
  })

  const histResults = [
    { listName: 'Lista Civica Progresso', coalition: 'Centro-Sinistra', candidateMayor: 'Marco Neri',   votes: 3200, percentage: 28.5, seats: 10 },
    { listName: 'Unione Democratica',     coalition: 'Centro-Sinistra', candidateMayor: 'Marco Neri',   votes: 2100, percentage: 18.7, seats: 7  },
    { listName: 'Futuro Insieme',         coalition: 'Centro-Destra',   candidateMayor: 'Anna Russo',   votes: 2800, percentage: 24.9, seats: 9  },
    { listName: 'Partito Popolare',       coalition: 'Centro-Destra',   candidateMayor: 'Anna Russo',   votes: 1900, percentage: 16.9, seats: 5  },
    { listName: 'Movimento Civico',       coalition: 'Lista Verdi',     candidateMayor: 'Paolo Verde',  votes: 1240, percentage: 11.0, seats: 1  },
  ]

  for (const r of histResults) {
    await prisma.historicalListResult.upsert({
      where: { id: histResults.indexOf(r) + 1 },
      update: {},
      create: { ...r, electionId: hist.id },
    })
  }

  console.log('✅ Seed completato')
  console.log('   Admin login: admin / admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
