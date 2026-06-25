import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';

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

    // Check if user exists
    const userExists = await db.user.findUnique({
      where: { id },
    });

    if (!userExists) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    // Protect admin accounts from deletion
    if (userExists.role === 'ADMIN') {
      return NextResponse.json({ error: 'No se pueden eliminar cuentas de administrador.' }, { status: 400 });
    }

    // Delete user (cascade will handle predictions and phase statuses)
    await db.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Usuario eliminado correctamente.' });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/users/[id]:', error);
    return NextResponse.json({ error: 'Error al eliminar el usuario.' }, { status: 500 });
  }
}
