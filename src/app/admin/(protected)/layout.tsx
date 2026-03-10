import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const ADMIN_COOKIE_NAME = 'admin_session';

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME);

  if (!session?.value) {
    redirect('/admin/login');
  }

  return <>{children}</>;
}


