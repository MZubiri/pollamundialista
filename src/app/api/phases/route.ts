import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/jwt';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    let userId: string | null = null;

    if (token) {
      const payload = await verifyJWT(token);
      if (payload) {
        userId = payload.userId;
      }
    }

    // Fetch all phases with their matches
    const phases = await db.phase.findMany({
      orderBy: { openAt: 'asc' },
      include: {
        matches: {
          orderBy: { matchDate: 'asc' },
        },
      },
    });

    // If logged in, fetch user's predictions and phase statuses
    let predictions: any[] = [];
    let phaseStatuses: any[] = [];
    if (userId) {
      predictions = await db.prediction.findMany({
        where: { userId },
      });
      phaseStatuses = await db.userPhaseStatus.findMany({
        where: { userId },
      });
    }

    return NextResponse.json({ phases, predictions, phaseStatuses });
  } catch (error: any) {
    console.error('Error in GET /api/phases:', error);
    return NextResponse.json({ error: 'Error al obtener las fases.' }, { status: 500 });
  }
}
