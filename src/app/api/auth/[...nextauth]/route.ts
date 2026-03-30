import NextAuth from 'next-auth';
import Discord from 'next-auth/providers/discord';

const handler = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as typeof session.user & { discordId: string }).discordId = token.sub;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
