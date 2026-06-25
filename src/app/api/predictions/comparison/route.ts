import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/jwt';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No autorizado. Inicie sesión.' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Sesión inválida o expirada.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get('otherUserId');

    if (!otherUserId) {
      return NextResponse.json({ error: 'Falta el ID del otro usuario.' }, { status: 400 });
    }

    // Fetch other user info
    const otherUser = await db.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, name: true }
    });

    if (!otherUser) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    // Fetch current user predictions
    const myPredictions = await db.prediction.findMany({
      where: { userId: payload.userId }
    });

    // Fetch other user predictions
    const otherPredictions = await db.prediction.findMany({
      where: { userId: otherUserId }
    });

    // Fetch all phases with matches
    const phases = await db.phase.findMany({
      orderBy: { openAt: 'asc' },
      include: {
        matches: {
          orderBy: { matchDate: 'asc' }
        }
      }
    });

    const now = new Date();
    const comparison = phases.map(phase => {
      const isClosed = phase.status === 'CLOSED' || now > new Date(phase.closeAt);
      
      const matchesWithPreds = phase.matches.map(match => {
        const myPred = myPredictions.find(p => p.matchId === match.id);
        const otherPred = otherPredictions.find(p => p.matchId === match.id);

        return {
          id: match.id,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          matchDate: match.matchDate,
          homeScoreReal: match.homeScoreReal,
          awayScoreReal: match.awayScoreReal,
          status: match.status,
          myPrediction: myPred ? {
            homeScorePredicted: myPred.homeScorePredicted,
            awayScorePredicted: myPred.awayScorePredicted,
            points: myPred.points
          } : null,
          otherPrediction: otherPred ? {
            homeScorePredicted: isClosed ? otherPred.homeScorePredicted : null,
            awayScorePredicted: isClosed ? otherPred.awayScorePredicted : null,
            points: otherPred.points,
            isMasked: !isClosed
          } : null
        };
      });

      return {
        id: phase.id,
        name: phase.name,
        status: phase.status,
        closeAt: phase.closeAt,
        isClosed,
        matches: matchesWithPreds
      };
    });

    return NextResponse.json({
      otherUser,
      comparison
    });

  } catch (error: any) {
    console.error('Error in GET /api/predictions/comparison:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
