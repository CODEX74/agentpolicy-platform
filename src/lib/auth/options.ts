import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from './password';

const providers: NextAuthOptions['providers'] = [
  CredentialsProvider({
    name: 'Credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      const email = credentials.email.toLowerCase();

      const user = await prisma.user.findUnique({ where: { email } });
      if (user?.password) {
        const ok = verifyPassword(credentials.password, user.password);
        const emailVerificationRequired =
          Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS) ||
          Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

        if (ok && (!emailVerificationRequired || user.emailVerified)) {
          return {
            id: user.id,
            email: user.email ?? undefined,
            name: user.name ?? undefined,
            image: user.image ?? undefined,
            plan: user.plan ?? 'free',
            subscriptionExpiresAt: user.subscriptionExpiresAt,
          };
        }
      }
      return null;
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.unshift(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login', error: '/login' },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.plan = (user as { plan?: string }).plan;
        token.subscriptionExpiresAt = (user as { subscriptionExpiresAt?: string | null }).subscriptionExpiresAt;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as { id?: string; plan?: string; subscriptionExpiresAt?: string | null };
        u.id = token.id as string;
        u.plan = token.plan as string | undefined;
        u.subscriptionExpiresAt = token.subscriptionExpiresAt as string | null | undefined;
      }
      return session;
    },
  },
};
