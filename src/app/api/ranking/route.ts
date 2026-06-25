import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phaseId = searchParams.get('phaseId');

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
            points: true,
          },
        },
      },
    });

    const ranking = users
      .map((user) => {
        const totalPoints = user.predictions.reduce((sum, pred) => sum + (pred.points ?? 0), 0);
        const matchesPredictedCount = user.predictions.length;
        
        return {
          id: user.id,
          name: user.name,
          points: totalPoints,
          predictionsCount: matchesPredictedCount,
        };
      })
      .sort((a, b) => b.points - a.points);

    return NextResponse.json({ ranking });
  } catch (error: any) {
    console.error('Error al obtener ranking:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
