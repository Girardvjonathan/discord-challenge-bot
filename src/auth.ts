import NextAuth from 'next-auth';
import Discord from 'next-auth/providers/discord';
import { prisma } from './lib/prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.id) return false;
      await prisma.user.upsert({
        where: { discordId: profile.id as string },
        update: {
          username: (profile.username ?? profile.global_name) as string,
          avatar: (profile.avatar as string) ?? null,
        },
        create: {
          discordId: profile.id as string,
          username: (profile.username ?? profile.global_name ?? 'Unknown') as string,
          avatar: (profile.avatar as string) ?? null,
        },
      });
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as typeof session.user & { discordId: string }).discordId = token.sub;
      }
      return session;
    },
  },
});
