import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const adminUsername = process.env.ADMIN_USERNAME
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH

        if (!adminUsername || !adminPasswordHash) return null
        if (credentials.username !== adminUsername) return null

        const valid = await bcrypt.compare(credentials.password, adminPasswordHash)
        if (!valid) return null

        return { id: '1', name: adminUsername, email: `${adminUsername}@peritrack.local` }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: parseInt(process.env.SESSION_DURATION_DAYS ?? '7') * 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as { id?: string }).id = token.id as string
      }
      return session
    },
  },
}
