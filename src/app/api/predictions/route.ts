import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Debes iniciar sesión para guardar tus pronósticos.' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Sesión inválida o expirada.' }, { status: 401 });
    }

    // Get fresh user status from DB
    const user = await db.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({
        error: 'Tu cuenta aún no está activa. Envía tu pago por WhatsApp al administrador para activar tu participación.',
        status: 'INACTIVE',
      }, { status: 403 });
    }

    if (user.role === 'ADMIN') {
      return NextResponse.json({ error: 'El administrador no puede registrar pronósticos, solo gestiona la plataforma.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { predictions } = body;

    if (!Array.isArray(predictions) || predictions.length === 0) {
      return NextResponse.json({ error: 'No se enviaron pronósticos para guardar.' }, { status: 400 });
    }

    const now = new Date();

    // Check each prediction before saving
    for (const pred of predictions) {
      const { matchId, homeScorePredicted, awayScorePredicted } = pred;

      if (matchId === undefined || homeScorePredicted === undefined || awayScorePredicted === undefined) {
        return NextResponse.json({ error: 'Datos de pronóstico incompletos.' }, { status: 400 });
      }

      // Fetch match and check phase status
      const match = await db.match.findUnique({
        where: { id: matchId },
        include: { phase: true },
      });

      if (!match) {
        return NextResponse.json({ error: `Partido no encontrado: ${matchId}` }, { status: 404 });
      }

      // Check phase-specific payment status
      const userPhase = await db.userPhaseStatus.findUnique({
        where: {
          userId_phaseId: {
            userId: user.id,
            phaseId: match.phaseId,
          },
        },
      });

      if (!userPhase || userPhase.status !== 'ACTIVE') {
        return NextResponse.json({
          error: `Tu participación en la fase "${match.phase.name}" no está activa. Envía tu pago de 10 soles por WhatsApp al administrador para activar esta fase.`,
          status: 'INACTIVE',
          phaseId: match.phaseId,
        }, { status: 403 });
      }

      // Check if phase is OPEN and not closed by date/time
      if (match.phase.status !== 'OPEN') {
        return NextResponse.json({
          error: `La fase "${match.phase.name}" no está abierta. No se pueden guardar pronósticos.`,
        }, { status: 400 });
      }

      if (now > new Date(match.matchDate)) {
        return NextResponse.json({
          error: `El partido ${match.homeTeam} vs ${match.awayTeam} ya comenzó o pasó su fecha de juego. No se pueden registrar pronósticos para este encuentro.`,
        }, { status: 400 });
      }

      // Check if match already has results
      if (match.status === 'PLAYED' || match.homeScoreReal !== null) {
        return NextResponse.json({
          error: `El partido ${match.homeTeam} vs ${match.awayTeam} ya se jugó o tiene un resultado registrado. No se puede pronosticar.`,
        }, { status: 400 });
      }
    }

    // Perform upserts in a transaction
    const saved = await db.$transaction(
      predictions.map((pred) => {
        const { matchId, homeScorePredicted, awayScorePredicted } = pred;
        return db.prediction.upsert({
          where: {
            userId_matchId: {
              userId: user.id,
              matchId,
            },
          },
          update: {
            homeScorePredicted: parseInt(homeScorePredicted, 10),
            awayScorePredicted: parseInt(awayScorePredicted, 10),
            points: null, // resets points if match has no result yet
          },
          create: {
            userId: user.id,
            matchId,
            homeScorePredicted: parseInt(homeScorePredicted, 10),
            awayScorePredicted: parseInt(awayScorePredicted, 10),
          },
        });
      })
    );

    return NextResponse.json({ success: true, count: saved.length });
  } catch (error: any) {
    console.error('Error al guardar pronósticos:', error);
    return NextResponse.json({ error: 'Error al procesar la solicitud.' }, { status: 500 });
  }
}
