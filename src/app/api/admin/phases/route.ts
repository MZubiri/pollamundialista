import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado. Se requiere perfil administrador.' }, { status: 403 });
  }

  try {
    const phases = await db.phase.findMany({
      orderBy: { openAt: 'asc' },
      include: {
        _count: {
          select: { matches: true },
        },
      },
    });
    return NextResponse.json({ phases });
  } catch (error: any) {
    console.error('Error in GET /api/admin/phases:', error);
    return NextResponse.json({ error: 'Error al obtener fases.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado. Se requiere perfil administrador.' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { name, openAt, closeAt, status } = body;

    if (!name || !openAt || !closeAt) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (nombre, apertura, cierre).' }, { status: 400 });
    }

    const phase = await db.phase.create({
      data: {
        name,
        openAt: new Date(openAt),
        closeAt: new Date(closeAt),
        status: status || 'LOCKED',
      },
    });

    return NextResponse.json({ success: true, phase });
  } catch (error: any) {
    console.error('Error in POST /api/admin/phases:', error);
    return NextResponse.json({ error: 'Error al crear la fase.' }, { status: 500 });
  }
}
