import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { safeDbConnect } from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import { getFileUserByEmail, updateFileUserPassword } from '@/lib/db/file-users';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import { z } from 'zod';

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'Пароль не менее 6 символов'),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const email = session.user.email;
    const body = await req.json();
    const { currentPassword, newPassword } = bodySchema.parse(body);

    const fileUser = await getFileUserByEmail(email);
    if (fileUser) {
      if (!verifyPassword(currentPassword, fileUser.password)) {
        return NextResponse.json({ error: 'Неверный текущий пароль' }, { status: 400 });
      }
      const hash = hashPassword(newPassword);
      await updateFileUserPassword(email, hash);
      return NextResponse.json({ success: true });
    }

    const db = await safeDbConnect();
    if (db) {
      const user = await User.findOne({ email });
      if (user?.password) {
        if (!verifyPassword(currentPassword, user.password)) {
          return NextResponse.json({ error: 'Неверный текущий пароль' }, { status: 400 });
        }
        user.password = hashPassword(newPassword);
        await user.save();
        return NextResponse.json({ success: true });
      }
      if (user && !user.password) {
        return NextResponse.json({ error: 'Вход выполнен через OAuth, смена пароля недоступна' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const msg = err.errors.map((e) => e.message).join('; ');
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error('PATCH /api/user/password', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
