import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';

function calculatePoints(
  homePredicted: number,
  awayPredicted: number,
  homeReal: number,
  awayReal: number
): number {
  // 1. Exact Match: 3 points
  if (homePredicted === homeReal && awayPredicted === awayReal) {
    return 3;
  }

  // 2. Correct Outcome (Winner or Draw): 1 point
  const realOutcome = Math.sign(homeReal - awayReal); // 1, -1, or 0
  const predictedOutcome = Math.sign(homePredicted - awayPredicted); // 1, -1, or 0

  if (realOutcome === predictedOutcome) {
    return 1;
  }

  // 3. Incorrect: 0 points
  return 0;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado. Se requiere perfil administrador.' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { homeScoreReal, awayScoreReal } = body;

    // Check if resetting score
    const isReset =
      homeScoreReal === null ||
      awayScoreReal === null ||
      homeScoreReal === undefined ||
      awayScoreReal === undefined;

    if (isReset) {
      // Reset match status to PENDING and clear scores
      await db.match.update({
        where: { id },
        data: {
          homeScoreReal: null,
          awayScoreReal: null,
          status: 'PENDING',
        },
      });

      // Clear points on predictions
      await db.prediction.updateMany({
        where: { matchId: id },
        data: {
          points: null,
        },
      });

      return NextResponse.json({ success: true, message: 'Resultado reiniciado con éxito.' });
    }

    const hReal = parseInt(homeScoreReal, 10);
    const aReal = parseInt(awayScoreReal, 10);

    if (isNaN(hReal) || isNaN(aReal)) {
      return NextResponse.json({ error: 'Los marcadores deben ser números enteros.' }, { status: 400 });
    }

    // Update match status to PLAYED and save score
    const match = await db.match.update({
      where: { id },
      data: {
        homeScoreReal: hReal,
        awayScoreReal: aReal,
        status: 'PLAYED',
      },
    });

    // Fetch predictions for this match
    const predictions = await db.prediction.findMany({
      where: { matchId: id },
    });

    // Calculate points and update predictions
    if (predictions.length > 0) {
      await db.$transaction(
        predictions.map((pred) => {
          const points = calculatePoints(
            pred.homeScorePredicted,
            pred.awayScorePredicted,
            hReal,
            aReal
          );

          return db.prediction.update({
            where: { id: pred.id },
            data: { points },
          });
        })
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Resultado guardado y puntajes recalculados.',
      match,
      recalculatedPredictions: predictions.length,
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/matches/[id]/score:', error);
    return NextResponse.json({ error: 'Error al registrar marcador.' }, { status: 500 });
  }
}
