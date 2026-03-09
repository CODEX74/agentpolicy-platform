import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from './mongodb-client';
import dbConnect from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import { getFileUserByEmail } from '@/lib/db/file-users';
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

        // Сначала проверяем файловое хранилище — быстро, без ожидания MongoDB
        const fileUser = await getFileUserByEmail(email);
        if (fileUser) {
          const ok = verifyPassword(credentials.password, fileUser.password);
          if (ok) {
            return {
              id: fileUser.id,
              email: fileUser.email,
              name: fileUser.name,
              image: '',
              plan: fileUser.plan ?? 'free',
              subscriptionExpiresAt: fileUser.subscriptionExpiresAt ?? null,
            };
          }
          return null;
        }

        // Пользователя нет в файле — пробуем MongoDB
        try {
          await dbConnect();
          const user = await User.findOne({ email });
          if (user?.password) {
            const ok = verifyPassword(credentials.password, user.password);
            if (ok) return { id: user._id.toString(), email: user.email, name: user.name, image: user.image };
          }
        } catch {
          // MongoDB недоступна — пользователь не найден
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
  adapter: MongoDBAdapter(clientPromise),
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
