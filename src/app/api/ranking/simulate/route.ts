import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { simulations, phaseId } = body; // Array of { matchId: string, homeScore: number, awayScore: number }, optional phaseId

    if (!Array.isArray(simulations)) {
      return NextResponse.json({ error: 'Formato inválido.' }, { status: 400 });
    }

    // Fetch all active users with predictions (filtered by phaseId if present)
    const users = await db.user.findMany({
      where: { role: 'USER', status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        predictions: {
          where: phaseId ? {
            match: { phaseId }
          } : undefined,
          select: {
            matchId: true,
            homeScorePredicted: true,
            awayScorePredicted: true,
            points: true,
          }
        }
      }
    });

    // Create a map of simulations for easy lookup
    const simMap = new Map<string, { home: number, away: number }>();
    simulations.forEach(sim => {
      if (sim.matchId && sim.homeScore !== undefined && sim.awayScore !== undefined && sim.homeScore !== '' && sim.awayScore !== '') {
        const homeVal = parseInt(sim.homeScore, 10);
        const awayVal = parseInt(sim.awayScore, 10);
        if (!isNaN(homeVal) && !isNaN(awayVal)) {
          simMap.set(sim.matchId, { home: homeVal, away: awayVal });
        }
      }
    });

    // Function to calculate simulated points for a prediction
    const calculateSimulatedPoints = (
      homePredicted: number,
      awayPredicted: number,
      homeReal: number,
      awayReal: number
    ): number => {
      if (homePredicted === homeReal && awayPredicted === awayReal) {
        return 3;
      }
      const realOutcome = Math.sign(homeReal - awayReal);
      const predOutcome = Math.sign(homePredicted - awayPredicted);
      if (realOutcome === predOutcome) {
        return 1;
      }
      return 0;
    };

    // Calculate simulated ranking
    const simulatedRanking = users.map(user => {
      let totalPoints = 0;
      let predictionsCount = 0;

      user.predictions.forEach(pred => {
        predictionsCount++;
        // If there's a simulation for this match, calculate simulated points
        if (simMap.has(pred.matchId)) {
          const sim = simMap.get(pred.matchId)!;
          totalPoints += calculateSimulatedPoints(
            pred.homeScorePredicted,
            pred.awayScorePredicted,
            sim.home,
            sim.away
          );
        } else {
          // Otherwise, use existing points (if match was already played, or 0 if pending)
          totalPoints += (pred.points ?? 0);
        }
      });

      return {
        id: user.id,
        name: user.name,
        points: totalPoints,
        predictionsCount
      };
    });

    // Sort by points descending
    simulatedRanking.sort((a, b) => b.points - a.points);

    // Assign simulated rank with ties
    let currentRank = 1;
    const rankedList = simulatedRanking.map((row, idx) => {
      if (idx > 0 && row.points < simulatedRanking[idx - 1].points) {
        currentRank = idx + 1;
      }
      return { ...row, rank: currentRank };
    });

    return NextResponse.json({ ranking: rankedList });

  } catch (error: any) {
    console.error('Error in POST /api/ranking/simulate:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
