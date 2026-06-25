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
    const { name, openAt, closeAt, status } = body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (openAt !== undefined) data.openAt = new Date(openAt);
    if (closeAt !== undefined) data.closeAt = new Date(closeAt);
    if (status !== undefined) data.status = status;

    const updatedPhase = await db.phase.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, phase: updatedPhase });
  } catch (error: any) {
    console.error('Error in PUT /api/admin/phases/[id]:', error);
    return NextResponse.json({ error: 'Error al actualizar fase.' }, { status: 500 });
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
    await db.phase.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/phases/[id]:', error);
    return NextResponse.json({ error: 'Error al eliminar fase.' }, { status: 500 });
  }
}
