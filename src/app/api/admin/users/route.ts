import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado. Se requiere perfil administrador.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);

    let whereClause: any = { role: 'USER' };

    if (search) {
      whereClause = {
        role: 'USER',
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { id: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const totalCount = await db.user.count({ where: whereClause });
    const totalPages = Math.ceil(totalCount / limit);

    const users = await db.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        phaseStatuses: {
          select: {
            phaseId: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      users,
      totalPages,
      totalCount,
      currentPage: page,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json({ error: 'Error al obtener usuarios.' }, { status: 500 });
  }
}
