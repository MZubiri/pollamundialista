import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';

export async function PUT(
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
    const { homeTeam, awayTeam, matchDate, phaseId } = body;

    const data: any = {};
    if (homeTeam !== undefined) data.homeTeam = homeTeam.trim();
    if (awayTeam !== undefined) data.awayTeam = awayTeam.trim();
    if (matchDate !== undefined) data.matchDate = new Date(matchDate);
    if (phaseId !== undefined) data.phaseId = phaseId;

    const updatedMatch = await db.match.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, match: updatedMatch });
  } catch (error: any) {
    console.error('Error in PUT /api/admin/matches/[id]:', error);
    return NextResponse.json({ error: 'Error al actualizar partido.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado. Se requiere perfil administrador.' }, { status: 403 });
  }

  try {
    const { id } = await params;
    await db.match.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/matches/[id]:', error);
    return NextResponse.json({ error: 'Error al eliminar partido.' }, { status: 500 });
  }
}
