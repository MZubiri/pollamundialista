const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.userPhaseStatus.deleteMany();
  await prisma.prediction.deleteMany();
  await prisma.match.deleteMany();
  await prisma.phase.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Administrador Polla',
      email: 'admin@polla.com',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('Users seeded:', {
    admin: admin.email,
  });

  // Create Phases
  const phase1 = await prisma.phase.create({
    data: {
      name: 'Ronda de 32',
      openAt: new Date('2026-06-15T00:00:00-05:00'),
      closeAt: new Date('2026-06-28T14:00:00-05:00'),
      status: 'OPEN',
    },
  });

  const phase2 = await prisma.phase.create({
    data: {
      name: 'Octavos de Final',
      openAt: new Date('2026-07-03T19:00:00-05:00'),
      closeAt: new Date('2026-07-04T12:00:00-05:00'),
      status: 'LOCKED',
    },
  });

  const phase3 = await prisma.phase.create({
    data: {
      name: 'Cuartos de Final',
      openAt: new Date('2026-07-07T14:00:00-05:00'),
      closeAt: new Date('2026-07-09T15:00:00-05:00'),
      status: 'LOCKED',
    },
  });

  const phase4 = await prisma.phase.create({
    data: {
      name: 'Semifinal',
      openAt: new Date('2026-07-11T23:00:00-05:00'),
      closeAt: new Date('2026-07-14T14:00:00-05:00'),
      status: 'LOCKED',
    },
  });

  const phase5 = await prisma.phase.create({
    data: {
      name: 'Final',
      openAt: new Date('2026-07-15T17:00:00-05:00'),
      closeAt: new Date('2026-07-19T14:00:00-05:00'),
      status: 'LOCKED',
    },
  });

  console.log('Phases seeded.');

  // Create UserPhaseStatus (Each phase requires its payment of 10 soles to be active)
  const phasesList = [phase1, phase2, phase3, phase4, phase5];
  
  // Admin is active for all phases
  for (const ph of phasesList) {
    await prisma.userPhaseStatus.create({
      data: {
        userId: admin.id,
        phaseId: ph.id,
        status: 'ACTIVE',
      },
    });
  }

  // No mock users phase statuses

  // Create Matches
  // Ronda de 32 (Fase Abierta) - 16 Matches (32 Slots)
  const r32Data = [
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-06-28T14:00:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-06-29T20:00:00-05:00') },
    { homeTeam: 'Alemania', awayTeam: 'A definir', matchDate: new Date('2026-06-29T15:30:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-06-30T16:00:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-01T15:00:00-05:00') },
    { homeTeam: 'Estados Unidos', awayTeam: 'A definir', matchDate: new Date('2026-07-01T19:00:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-02T14:00:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-02T18:00:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-06-29T12:00:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-06-30T12:00:00-05:00') },
    { homeTeam: 'México', awayTeam: 'A definir', matchDate: new Date('2026-06-30T20:00:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-01T11:00:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-02T22:00:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-03T20:30:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-03T13:00:00-05:00') },
    { homeTeam: 'Argentina', awayTeam: 'A definir', matchDate: new Date('2026-07-03T17:00:00-05:00') },
  ];

  const r32Matches = [];
  for (const item of r32Data) {
    const m = await prisma.match.create({
      data: {
        phaseId: phase1.id,
        homeTeam: item.homeTeam,
        awayTeam: item.awayTeam,
        matchDate: item.matchDate,
        status: 'PENDING',
      },
    });
    r32Matches.push(m);
  }

  // Octavos de Final (Locked) - 8 Matches
  const octavosData = [
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-04T12:00:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-04T16:00:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-06T19:00:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-06T14:00:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-05T15:00:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-05T19:00:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-07T15:00:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-07T11:00:00-05:00') },
  ];

  const octavosMatches = [];
  for (const item of octavosData) {
    const m = await prisma.match.create({
      data: {
        phaseId: phase2.id,
        homeTeam: item.homeTeam,
        awayTeam: item.awayTeam,
        matchDate: item.matchDate,
        status: 'PENDING',
      },
    });
    octavosMatches.push(m);
  }

  // Cuartos de Final (Locked) - 4 Matches
  const cuartosData = [
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-09T15:00:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-10T14:00:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-11T16:00:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-11T20:00:00-05:00') },
  ];

  const cuartosMatches = [];
  for (const item of cuartosData) {
    const m = await prisma.match.create({
      data: {
        phaseId: phase3.id,
        homeTeam: item.homeTeam,
        awayTeam: item.awayTeam,
        matchDate: item.matchDate,
        status: 'PENDING',
      },
    });
    cuartosMatches.push(m);
  }

  // Semifinal (Locked) - 2 Matches
  const semifinalData = [
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-14T14:00:00-05:00') },
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-15T14:00:00-05:00') },
  ];

  const semifinalMatches = [];
  for (const item of semifinalData) {
    const m = await prisma.match.create({
      data: {
        phaseId: phase4.id,
        homeTeam: item.homeTeam,
        awayTeam: item.awayTeam,
        matchDate: item.matchDate,
        status: 'PENDING',
      },
    });
    semifinalMatches.push(m);
  }

  // Final (Locked) - 1 Match
  const finalData = [
    { homeTeam: 'A definir', awayTeam: 'A definir', matchDate: new Date('2026-07-19T14:00:00-05:00') },
  ];

  const mFinal = await prisma.match.create({
    data: {
      phaseId: phase5.id,
      homeTeam: finalData[0].homeTeam,
      awayTeam: finalData[0].awayTeam,
      matchDate: finalData[0].matchDate,
      status: 'PENDING',
    },
  });

  console.log('Matches seeded.');

  // No mock users predictions

  // Admin also makes a prediction on Lugar 1 vs Lugar 2
  await prisma.prediction.create({
    data: {
      userId: admin.id,
      matchId: r32Matches[0].id,
      homeScorePredicted: 1,
      awayScorePredicted: 0,
      points: null,
    },
  });

  console.log('Predictions seeded.');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
