import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return new Response('No autorizado.', { status: 403 });
  }

  try {
    // Fetch all phases to use as column headers
    const phases = await db.phase.findMany({
      orderBy: { openAt: 'asc' },
      select: { id: true, name: true }
    });

    // Fetch all users with their phase payment statuses
    const users = await db.user.findMany({
      where: { role: 'USER' },
      orderBy: { name: 'asc' },
      include: {
        phaseStatuses: true
      }
    });

    // Generate CSV content
    // Headers: Nombre, Correo, Estado Global, Fecha Registro, Pago Ronda X...
    const headers = [
      'Nombre',
      'Correo',
      'Estado Global',
      'Fecha Registro',
      ...phases.map(p => `Pago: ${p.name}`)
    ];

    const rows = users.map(u => {
      const regDate = new Date(u.createdAt).toLocaleDateString('es-ES');
      const globalStatus = u.status === 'ACTIVE' ? 'Activo' : 'Inactivo';
      
      const phasePayments = phases.map(p => {
        const statusObj = u.phaseStatuses.find(ps => ps.phaseId === p.id);
        return statusObj && statusObj.status === 'ACTIVE' ? 'PAGADO' : 'PENDIENTE';
      });

      return [
        `"${u.name.replace(/"/g, '""')}"`,
        `"${u.email.replace(/"/g, '""')}"`,
        globalStatus,
        regDate,
        ...phasePayments
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    // Return as CSV attachment with UTF-8 BOM for proper Excel encoding
    const bom = '\uFEFF';
    return new Response(bom + csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="usuarios_polla_mundialista.csv"',
      },
    });

  } catch (error: any) {
    console.error('Error exporting users CSV:', error);
    return new Response('Error al exportar usuarios.', { status: 500 });
  }
}
