import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado. Se requiere perfil administrador.' }, { status: 403 });
  }

  try {
    const matches = await db.match.findMany({
      orderBy: { matchDate: 'asc' },
      include: {
        phase: true,
      },
    });
    return NextResponse.json({ matches });
  } catch (error: any) {
    console.error('Error in GET /api/admin/matches:', error);
    return NextResponse.json({ error: 'Error al obtener partidos.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado. Se requiere perfil administrador.' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { homeTeam, awayTeam, matchDate, phaseId } = body;

    if (!homeTeam || !awayTeam || !matchDate || !phaseId) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (local, visitante, fecha, fase).' }, { status: 400 });
    }

    const match = await db.match.create({
      data: {
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        matchDate: new Date(matchDate),
        phaseId,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ success: true, match });
  } catch (error: any) {
    console.error('Error in POST /api/admin/matches:', error);
    return NextResponse.json({ error: 'Error al crear partido.' }, { status: 500 });
  }
}
