import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/jwt';
import { db } from '@/lib/db';

export async function getAdminUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'ADMIN') return null;

    // Fetch user from DB to make sure their role is still ADMIN
    const user = await db.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.role !== 'ADMIN') return null;
    return user;
  } catch (error) {
    console.error('Error in getAdminUser:', error);
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;

    const payload = await verifyJWT(token);
    if (!payload) return null;

    // Fetch user from DB for latest status
    const user = await db.user.findUnique({
      where: { id: payload.userId },
    });

    return user;
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}
