import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado. Se requiere perfil administrador.' }, { status: 403 });
  }

  try {
    const totalUsers = await db.user.count({
      where: { role: 'USER' },
    });

    const activeUsers = await db.user.count({
      where: { role: 'USER', status: 'ACTIVE' },
    });

    const inactiveUsers = await db.user.count({
      where: { role: 'USER', status: 'INACTIVE' },
    });

    const totalPredictions = await db.prediction.count();

    const activeInscriptions = await db.userPhaseStatus.count({
      where: {
        status: 'ACTIVE',
        user: { role: 'USER' }
      }
    });

    const totalPhases = await db.phase.count();
    const totalRevenue = activeInscriptions * 10;
    const targetGoal = totalPhases * 100;
    const profit = totalRevenue - targetGoal;

    return NextResponse.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalPredictions,
      activeInscriptions,
      totalRevenue,
      targetGoal,
      profit,
      totalPhases,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/stats:', error);
    return NextResponse.json({ error: 'Error al obtener estadísticas del servidor.' }, { status: 500 });
  }
}
