import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/jwt';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Sesión inválida o expirada.' }, { status: 401 });
    }

    const userId = payload.userId;

    // 1. Fetch user to verify active
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Usuario no encontrado o inactivo.' }, { status: 403 });
    }

    // 2. Fetch user's predictions with points
    const myPredictions = await db.prediction.findMany({
      where: { userId },
      include: {
        match: true,
      },
    });

    // 3. Compute accuracy
    const playedPredictions = myPredictions.filter(p => p.match.status === 'PLAYED' && p.points !== null);
    const totalPlayed = playedPredictions.length;
    const exact = playedPredictions.filter(p => p.points === 3).length;
    const outcome = playedPredictions.filter(p => p.points === 1).length;
    const missed = playedPredictions.filter(p => p.points === 0).length;

    const accuracy = {
      totalPlayed,
      exact,
      exactPercent: totalPlayed > 0 ? Math.round((exact / totalPlayed) * 100) : 0,
      outcome,
      outcomePercent: totalPlayed > 0 ? Math.round((outcome / totalPlayed) * 100) : 0,
      missed,
      missedPercent: totalPlayed > 0 ? Math.round((missed / totalPlayed) * 100) : 0,
    };

    // 4. Compute ranking evolution phase by phase
    // Fetch all active users with predictions
    const allUsers = await db.user.findMany({
      where: { role: 'USER', status: 'ACTIVE' },
      include: {
        predictions: true,
      },
    });

    // Fetch all phases sorted
    const phases = await db.phase.findMany({
      orderBy: { openAt: 'asc' },
      include: {
        matches: true,
      },
    });

    const evolution: any[] = [];
    const matchIdsAccumulated = new Set<string>();

    for (const phase of phases) {
      // Add all match IDs of this phase to the accumulated set
      phase.matches.forEach(m => matchIdsAccumulated.add(m.id));

      // If the phase has no matches yet, or all matches are pending, we can still compute it, 
      // but let's only include phases that are closed or have matches that have been played to make it meaningful.
      // Actually, we can compute it for all phases to show the progress.
      
      const userScores = allUsers.map(u => {
        const points = u.predictions
          .filter(pred => matchIdsAccumulated.has(pred.matchId))
          .reduce((sum, pred) => sum + (pred.points ?? 0), 0);
        return { id: u.id, points };
      });

      // Sort users by points
      userScores.sort((a, b) => b.points - a.points);

      // Compute rank with ties
      let currentRank = 1;
      let userRank = 1;
      let userPoints = 0;

      const ranked = userScores.map((score, idx) => {
        if (idx > 0 && score.points < userScores[idx - 1].points) {
          currentRank = idx + 1;
        }
        if (score.id === userId) {
          userRank = currentRank;
          userPoints = score.points;
        }
        return { id: score.id, points: score.points, rank: currentRank };
      });

      evolution.push({
        phaseId: phase.id,
        phaseName: phase.name,
        rank: userRank,
        points: userPoints,
        totalPlayers: allUsers.length,
      });
    }

    return NextResponse.json({
      accuracy,
      evolution,
    });
  } catch (error: any) {
    console.error('Error in GET /api/profile/stats:', error);
    return NextResponse.json({ error: 'Error al obtener estadísticas del perfil.' }, { status: 500 });
  }
}
