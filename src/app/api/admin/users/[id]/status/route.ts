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
    const { status, phaseId } = body;

    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      return NextResponse.json({ error: 'Estado inválido. Debe ser ACTIVE o INACTIVE.' }, { status: 400 });
    }

    if (phaseId) {
      // Update or insert phase-specific payment status
      const updatedPhaseStatus = await db.userPhaseStatus.upsert({
        where: {
          userId_phaseId: {
            userId: id,
            phaseId,
          },
        },
        update: { status },
        create: {
          userId: id,
          phaseId,
          status,
        },
      });
      return NextResponse.json({ success: true, phaseStatus: updatedPhaseStatus });
    }

    // Fallback: update global user account status
    const updatedUser = await db.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Error in PUT /api/admin/users/[id]/status:', error);
    return NextResponse.json({ error: 'Error al actualizar el estado del usuario.' }, { status: 500 });
  }
}
