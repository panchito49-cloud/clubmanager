import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { clubs, memberships, sessions, users } from "@/db/schema";
import { generateToken } from "@/lib/password";

export const SESSION_COOKIE = "cm_session";
const SESSION_DAYS = 7;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type ClubMembership = {
  id: string;
  clubId: string;
  clubName: string;
  clubSlug: string;
  clubStatus: string;
  role: "club_admin" | "coach" | "guardian" | "player";
  status: "active" | "invited" | "disabled";
};

export type AuthSession = {
  sessionId: string;
  clubId: string | null;
  user: {
    id: string;
    email: string;
    fullName: string;
    isPlatformAdmin: boolean;
    mustChangePassword: boolean;
  };
  memberships: ClubMembership[];
};

/**
 * Sesiones con estado en base de datos: la cookie solo contiene un token
 * aleatorio de 256 bits y en la base se guarda su hash SHA-256.
 */
export async function createSession(input: {
  userId: string;
  clubId: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    userId: input.userId,
    clubId: input.clubId,
    tokenHash: hashToken(token),
    expiresAt,
    ip: input.ip ?? null,
    userAgent: input.userAgent?.slice(0, 300) ?? null,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, hashToken(token)));
  }

  cookieStore.delete(SESSION_COOKIE);
}

/** Cambia el club activo de la sesion actual (usuario con varias membresias). */
export async function setSessionClub(clubId: string): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;

  await db
    .update(sessions)
    .set({ clubId })
    .where(eq(sessions.tokenHash, hashToken(token)));
}

export const getAuth = cache(async (): Promise<AuthSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      sessionId: sessions.id,
      clubId: sessions.clubId,
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
      isPlatformAdmin: users.isPlatformAdmin,
      mustChangePassword: users.mustChangePassword,
      userStatus: users.status,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        gt(sessions.expiresAt, new Date()),
        isNull(sessions.revokedAt),
        eq(users.status, "active"),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const membershipRows = await db
    .select({
      id: memberships.id,
      clubId: memberships.clubId,
      role: memberships.role,
      status: memberships.status,
      clubName: clubs.name,
      clubSlug: clubs.slug,
      clubStatus: clubs.status,
    })
    .from(memberships)
    .innerJoin(clubs, eq(clubs.id, memberships.clubId))
    .where(and(eq(memberships.userId, row.userId), eq(memberships.status, "active")));

  return {
    sessionId: row.sessionId,
    clubId: row.clubId,
    user: {
      id: row.userId,
      email: row.email,
      fullName: row.fullName,
      isPlatformAdmin: row.isPlatformAdmin,
      mustChangePassword: row.mustChangePassword,
    },
    memberships: membershipRows,
  };
});
