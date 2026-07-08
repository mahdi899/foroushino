import { AdminLoginForm } from './LoginForm';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const sp = await searchParams;
  const redirectFrom = sp.from?.startsWith('/admin') ? sp.from : '/admin';

  return (
    <main className="admin-login-screen">
      <AdminLoginForm redirectFrom={redirectFrom} />
    </main>
  );
}
