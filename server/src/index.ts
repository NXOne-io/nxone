import { and, eq, gt, inArray } from "drizzle-orm";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import {
  LOGIN_TOKEN_TTL_MS, SESSION_TTL_MS, clearedCookie, hashToken, isEmail,
  normaliseEmail, randomToken, readCookie, sessionCookie, type Session
} from "./auth/tokens";
import { PLANS, TRIAL_DAYS, entitlementsFor, planById, priceFor } from "./billing/plans";
import { paymentProvider } from "./billing/provider";
import * as schema from "./db/schema";
import { emailSender, loginEmail } from "./http/email";
import { corsHeaders, json, problem, rateLimit } from "./http/respond";
import { changesSince, mergePush, type SyncRecord } from "./sync/merge";

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  APP_ORIGIN: string;
  EMAIL_PROVIDER?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  /** Set when a payment provider is connected. Without these, checkout says so plainly. */
  PAYMENT_PROVIDER?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  /** Maps our plan and period to the provider's own plan ids, as JSON. */
  RAZORPAY_PLANS?: string;
}

const uid = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;

/** Everything behind a login goes through here, so no route can forget to check. */
async function currentSession(req: Request, env: Env): Promise<{ token: string; session: Session } | null> {
  const token = readCookie(req.headers.get("Cookie"), "nxone_session");
  if (!token) return null;
  const raw = await env.SESSIONS.get(`session:${token}`);
  if (!raw) return null;
  const session = JSON.parse(raw) as Session;
  if (session.expiresAt < Date.now()) {
    await env.SESSIONS.delete(`session:${token}`);
    return null;
  }
  return { token, session };
}

/** A person can only ever touch an organisation they belong to. */
async function membership(db: DrizzleD1Database<typeof schema>, userId: string, orgId: string) {
  const rows = await db.select().from(schema.memberships)
    .where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.orgId, orgId))).limit(1);
  return rows[0];
}

/** The plan an organisation is on, and what that allows today. */
async function allowance(db: DrizzleD1Database<typeof schema>, orgId: string) {
  const org = (await db.select().from(schema.organisations).where(eq(schema.organisations.id, orgId)).limit(1))[0];
  if (!org) return null;
  return { org, ...entitlementsFor(org.plan, org.trialEndsAt?.getTime() ?? null) };
}

async function audit(db: DrizzleD1Database<typeof schema>, req: Request, entry: { orgId: string; userId?: string; action: string; recordKind?: string; recordId?: string; summary?: string }) {
  await db.insert(schema.auditLog).values({
    id: uid("au"), at: new Date(), ip: req.headers.get("CF-Connecting-IP") ?? undefined,
    userAgent: req.headers.get("User-Agent")?.slice(0, 200) ?? undefined, ...entry
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    /**
     * The app is allowed, and any local port while the API itself is running locally, so that
     * development works without widening what a deployed API accepts.
     */
    const origin = req.headers.get("Origin");
    const isLocalApi = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const localOrigin = Boolean(origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
    const allowed = [env.APP_ORIGIN, ...(isLocalApi && localOrigin && origin ? [origin] : [])];
    const cors = corsHeaders(origin, allowed);
    const secure = url.protocol === "https:";

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const db = drizzle(env.DB, { schema });
    const reply = (res: Response) => {
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, String(v));
      return res;
    };

    try {
      /* ---------- health ---------- */
      if (url.pathname === "/health") return reply(json({ ok: true, time: new Date().toISOString() }));

      /* ---------- ask for a login link ---------- */
      if (url.pathname === "/auth/request" && req.method === "POST") {
        const { email } = (await req.json()) as { email?: string };
        if (!email || !isEmail(email)) return reply(problem(400, "That does not look like an email address."));

        const address = normaliseEmail(email);
        const ip = req.headers.get("CF-Connecting-IP") ?? "unknown";
        if (!(await rateLimit(env.SESSIONS, `login:${address}`, 5, 15 * 60 * 1000))
          || !(await rateLimit(env.SESSIONS, `loginip:${ip}`, 20, 15 * 60 * 1000))) {
          return reply(problem(429, "Too many attempts. Try again in a few minutes."));
        }

        const token = randomToken();
        await db.insert(schema.loginTokens).values({
          tokenHash: await hashToken(token), email: address,
          expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MS), createdAt: new Date(), requestIp: ip
        });

        const link = `${env.APP_ORIGIN}/sign-in/?token=${token}`;
        const message = { ...loginEmail(link, LOGIN_TOKEN_TTL_MS / 60000), to: address };
        const sent = await emailSender(env).send(message);

        // the answer never says whether the address is known, which would be a way to enumerate users
        return reply(json({ ok: true, sent }));
      }

      /* ---------- use the link ---------- */
      if (url.pathname === "/auth/verify" && req.method === "POST") {
        const { token } = (await req.json()) as { token?: string };
        if (!token) return reply(problem(400, "No sign-in token was sent."));

        const hash = await hashToken(token);
        const rows = await db.select().from(schema.loginTokens).where(eq(schema.loginTokens.tokenHash, hash)).limit(1);
        const record = rows[0];
        if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
          return reply(problem(401, "That link has expired or has already been used. Please ask for a new one."));
        }
        await db.update(schema.loginTokens).set({ usedAt: new Date() }).where(eq(schema.loginTokens.tokenHash, hash));

        let user = (await db.select().from(schema.users).where(eq(schema.users.email, record.email)).limit(1))[0];
        let orgId: string | undefined;

        if (!user) {
          // first sign in: the person and their organisation are created together
          user = { id: uid("us"), email: record.email, name: null, createdAt: new Date(), lastSeenAt: new Date(), deletionRequestedAt: null };
          await db.insert(schema.users).values(user);
          orgId = uid("or");
          await db.insert(schema.organisations).values({
            id: orgId, name: "My business", country: "IN", currency: "INR", plan: "free", region: "auto",
            // a fortnight of Pro, without a card, because sync is only worth paying for once it is useful
            trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
            createdAt: new Date()
          });
          await db.insert(schema.memberships).values({ id: uid("me"), userId: user.id, orgId, role: "owner", createdAt: new Date() });
          await audit(db, req, { orgId, userId: user.id, action: "org.created" });
        } else {
          await db.update(schema.users).set({ lastSeenAt: new Date() }).where(eq(schema.users.id, user.id));
          orgId = (await db.select().from(schema.memberships).where(eq(schema.memberships.userId, user.id)).limit(1))[0]?.orgId;
        }

        const sessionToken = randomToken();
        const session: Session = { userId: user.id, email: user.email, orgId, createdAt: Date.now(), expiresAt: Date.now() + SESSION_TTL_MS };
        await env.SESSIONS.put(`session:${sessionToken}`, JSON.stringify(session), { expirationTtl: SESSION_TTL_MS / 1000 });
        await audit(db, req, { orgId: orgId!, userId: user.id, action: "auth.signed-in" });

        return reply(json({ ok: true, user: { email: user.email, name: user.name }, orgId },
          { headers: { "Set-Cookie": sessionCookie(sessionToken, secure) } }));
      }

      /* ---------- who am I ---------- */
      if (url.pathname === "/auth/me") {
        const found = await currentSession(req, env);
        if (!found) return reply(problem(401, "Not signed in."));
        const orgs = await db.select({ id: schema.organisations.id, name: schema.organisations.name, plan: schema.organisations.plan, role: schema.memberships.role })
          .from(schema.memberships).innerJoin(schema.organisations, eq(schema.memberships.orgId, schema.organisations.id))
          .where(eq(schema.memberships.userId, found.session.userId));
        const plan = found.session.orgId ? await allowance(db, found.session.orgId) : null;
        return reply(json({
          user: { email: found.session.email },
          orgId: found.session.orgId,
          organisations: orgs,
          plan: plan ? { id: plan.plan.id, name: plan.plan.name, trialing: plan.trialing, trialEndsAt: plan.trialEndsAt, limits: plan.limits } : null
        }));
      }

      /* ---------- sign out ---------- */
      if (url.pathname === "/auth/sign-out" && req.method === "POST") {
        const found = await currentSession(req, env);
        if (found) await env.SESSIONS.delete(`session:${found.token}`);
        return reply(json({ ok: true }, { headers: { "Set-Cookie": clearedCookie(secure) } }));
      }

      /* ---------- pull changes ---------- */
      if (url.pathname === "/sync/pull") {
        const found = await currentSession(req, env);
        if (!found?.session.orgId) return reply(problem(401, "Not signed in."));
        if (!(await membership(db, found.session.userId, found.session.orgId))) return reply(problem(403, "You do not have access to that organisation."));

        const allowed = await allowance(db, found.session.orgId);
        if (!allowed?.limits.sync) return reply(problem(402, "Syncing is part of Pro. Your work is safe on your device, and nothing has been lost.", { plan: allowed?.plan.id ?? "free" }));

        const since = Number(url.searchParams.get("since") ?? 0);
        const rows = await db.select().from(schema.records)
          .where(and(eq(schema.records.orgId, found.session.orgId), gt(schema.records.updatedAt, new Date(since))))
          .limit(501);

        const asSync: SyncRecord[] = rows.map((r) => ({
          kind: r.kind, localId: r.localId, body: JSON.parse(r.body), version: r.version,
          updatedAt: r.updatedAt.getTime(), deletedAt: r.deletedAt?.getTime() ?? null
        }));
        return reply(json(changesSince(asSync, since)));
      }

      /* ---------- push changes ---------- */
      if (url.pathname === "/sync/push" && req.method === "POST") {
        const found = await currentSession(req, env);
        if (!found?.session.orgId) return reply(problem(401, "Not signed in."));
        const member = await membership(db, found.session.userId, found.session.orgId);
        if (!member) return reply(problem(403, "You do not have access to that organisation."));
        if (member.role === "readonly") return reply(problem(403, "Your access to this organisation is read only."));

        const allowed = await allowance(db, found.session.orgId);
        if (!allowed?.limits.sync) return reply(problem(402, "Syncing is part of Pro. Your work is safe on your device, and nothing has been lost.", { plan: allowed?.plan.id ?? "free" }));

        const { records } = (await req.json()) as { records: SyncRecord[] };
        if (!Array.isArray(records) || records.length > 500) return reply(problem(400, "Send up to 500 records at a time."));
        if (records.length === 0) return reply(json({ applied: [], rejected: [], cursor: Date.now() }));

        const orgId = found.session.orgId;
        const existingRows = await db.select().from(schema.records)
          .where(and(eq(schema.records.orgId, orgId), inArray(schema.records.localId, records.map((r) => r.localId))));

        const existing = new Map<string, SyncRecord>(existingRows.map((r) => [`${r.kind}:${r.localId}`, {
          kind: r.kind, localId: r.localId, body: JSON.parse(r.body), version: r.version,
          updatedAt: r.updatedAt.getTime(), deletedAt: r.deletedAt?.getTime() ?? null
        }]));
        const byKeyId = new Map(existingRows.map((r) => [`${r.kind}:${r.localId}`, r.id]));

        const result = mergePush(records, existing);
        const at = new Date();

        for (const rec of result.applied) {
          const key = `${rec.kind}:${rec.localId}`;
          const rowId = byKeyId.get(key);
          const values = {
            orgId, kind: rec.kind, localId: rec.localId, body: JSON.stringify(rec.body),
            version: rec.version, updatedAt: at, deletedAt: rec.deletedAt ? new Date(rec.deletedAt) : null,
            updatedBy: found.session.userId
          };
          if (rowId) await db.update(schema.records).set(values).where(eq(schema.records.id, rowId));
          else await db.insert(schema.records).values({ id: uid("re"), ...values });
        }

        await audit(db, req, {
          orgId, userId: found.session.userId, action: "sync.push",
          summary: `${result.applied.length} applied, ${result.rejected.length} rejected`
        });

        return reply(json({ applied: result.applied.map((r) => ({ kind: r.kind, localId: r.localId, version: r.version })), rejected: result.rejected, cursor: at.getTime() }));
      }

      /* ---------- what the plans are ---------- */
      if (url.pathname === "/billing/plans") {
        const found = await currentSession(req, env);
        const country = (url.searchParams.get("country")
          ?? (found?.session.orgId ? (await allowance(db, found.session.orgId))?.org.country : null)
          ?? "IN").toUpperCase();

        return reply(json({
          country,
          provider: paymentProvider(env).name,
          checkoutConnected: paymentProvider(env).live,
          plans: PLANS.map((p) => ({ id: p.id, name: p.name, summary: p.summary, features: p.features, limits: p.limits, price: priceFor(p, country) }))
        }));
      }

      /* ---------- start paying ---------- */
      if (url.pathname === "/billing/checkout" && req.method === "POST") {
        const found = await currentSession(req, env);
        if (!found?.session.orgId) return reply(problem(401, "Not signed in."));
        const member = await membership(db, found.session.userId, found.session.orgId);
        if (member?.role !== "owner") return reply(problem(403, "Only the owner of the organisation can change the plan."));

        const { plan: planId, period } = (await req.json()) as { plan?: string; period?: "monthly" | "yearly" };
        const plan = planById(planId ?? "pro");
        if (plan.id === "free") return reply(problem(400, "The free plan does not need paying for."));

        const current = await allowance(db, found.session.orgId);
        const provider = paymentProvider(env);
        const session = await provider.createCheckout({
          orgId: found.session.orgId,
          email: found.session.email,
          plan,
          price: priceFor(plan, current?.org.country ?? "IN"),
          period: period === "yearly" ? "yearly" : "monthly",
          returnUrl: `${env.APP_ORIGIN}/settings/`
        });

        await audit(db, req, { orgId: found.session.orgId, userId: found.session.userId, action: "billing.checkout", summary: `${plan.id} ${period ?? "monthly"} via ${provider.name}` });
        return reply(json({ ...session, provider: provider.name, connected: provider.live }));
      }

      /* ---------- the provider telling us what happened ---------- */
      if (url.pathname === "/billing/webhook" && req.method === "POST") {
        const body = await req.text();
        const provider = paymentProvider(env);
        const signature = req.headers.get("X-Razorpay-Signature");
        if (!(await provider.verifyWebhook(body, signature))) return reply(problem(400, "That webhook could not be verified."));

        const event = JSON.parse(body) as { event?: string; payload?: { subscription?: { entity?: { id?: string; status?: string; notes?: { orgId?: string }; current_end?: number; plan_id?: string } } } };
        const sub = event.payload?.subscription?.entity;
        const orgId = sub?.notes?.orgId;
        if (!orgId) return reply(json({ ok: true, ignored: "no organisation on the event" }));

        const active = sub?.status === "active" || sub?.status === "authenticated";
        await db.update(schema.organisations)
          .set({ plan: active ? "pro" : "free", trialEndsAt: null })
          .where(eq(schema.organisations.id, orgId));

        await db.insert(schema.subscriptions).values({
          id: uid("sb"), orgId, provider: provider.name, providerRef: sub?.id ?? "unknown",
          plan: "pro", status: active ? "active" : "cancelled", currency: "INR", amountMinor: 0,
          currentPeriodEnd: sub?.current_end ? new Date(sub.current_end * 1000) : null,
          createdAt: new Date(), updatedAt: new Date()
        });

        await audit(db, req, { orgId, action: "billing.webhook", summary: `${event.event ?? "event"} -> ${active ? "active" : "inactive"}` });
        return reply(json({ ok: true }));
      }

      /* ---------- take everything with you ---------- */
      if (url.pathname === "/account/export") {
        const found = await currentSession(req, env);
        if (!found?.session.orgId) return reply(problem(401, "Not signed in."));
        const rows = await db.select().from(schema.records).where(eq(schema.records.orgId, found.session.orgId));
        return reply(json({
          exportedAt: new Date().toISOString(),
          organisation: found.session.orgId,
          records: rows.map((r) => ({ kind: r.kind, localId: r.localId, body: JSON.parse(r.body), updatedAt: r.updatedAt.getTime(), deletedAt: r.deletedAt?.getTime() ?? null }))
        }));
      }

      return reply(problem(404, "No such endpoint."));
    } catch (error) {
      console.error("Request failed:", error);
      return reply(problem(500, "Something went wrong here. Nothing was changed."));
    }
  }
} satisfies ExportedHandler<Env>;
