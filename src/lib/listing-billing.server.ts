import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  AsaasClient,
  AsaasFault,
  paidAsaasCycle,
  safeAsaasPaymentUrl,
  validBillingDocument,
} from "./asaas.server";
const noStore = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
};
const result = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: noStore });
const uuid = z.string().uuid();
const providerId = (id: unknown) =>
  typeof id === "string" && /^[a-zA-Z0-9_-]{3,160}$/.test(id);
function database() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("billing_unavailable");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
type Db = ReturnType<typeof database>;
export type BillingOrder = {
  id: string;
  user_id: string;
  listing_id: string;
  method: string;
  status: string;
  financial_started: boolean;
  customer_id: string | null;
  subscription_id: string | null;
  authorization_id: string | null;
  conciliation_id: string | null;
  payment_url: string | null;
  pix_payload: string | null;
  pix_image: string | null;
  qr_expires_at: string | null;
  renewal_status: string | null;
  paid_until: string | null;
  hold: boolean;
  cancel_requested_at: string | null;
  lease_token: string | null;
  attempts: number;
  error_code: string | null;
};
function provider() {
  return new AsaasClient(
    process.env.ASAAS_API_KEY ?? "",
    process.env.ASAAS_ENVIRONMENT ?? "production",
  );
}
function projection(order: BillingOrder | null) {
  return order
    ? {
        id: order.id,
        method: order.method,
        status: order.status,
        paymentUrl: safeAsaasPaymentUrl(order.payment_url),
        pixPayload: order.pix_payload,
        pixImage: order.pix_image,
        qrExpiresAt: order.qr_expires_at,
        paidUntil: order.paid_until,
        renewalStatus: order.renewal_status,
        hold: order.hold,
      }
    : null;
}
async function currentOrder(db: Db, listing: string, user: string) {
  const { data, error } = await db
    .from("member_listing_billing")
    .select("*")
    .eq("listing_id", listing)
    .eq("user_id", user)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("billing_unavailable");
  return data as BillingOrder | null;
}
export async function memberListingBilling(request: Request) {
  if (request.method !== "POST") return result({ error: "method" }, 405);
  try {
    const raw = await request.text();
    if (raw.length > 2000) return result({ error: "invalid_input" }, 400);
    const input = z
      .object({
        action: z.enum(["status", "checkout", "cancel"]),
        listingId: uuid,
        method: z.enum(["card", "pix_automatic"]).optional(),
        document: z.string().max(18).optional(),
        contactConsent: z.boolean().optional(),
        monthlyAccepted: z.boolean().optional(),
      })
      .parse(JSON.parse(raw));
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer ([A-Za-z0-9_.-]+)$/)?.[1];
    if (!token) return result({ error: "unauthorized" }, 401);
    const db = database();
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user || auth.user.is_anonymous)
      return result({ error: "unauthorized" }, 401);
    const user = auth.user;
    const { data: listing, error: listingError } = await db
      .from("member_bike_listings")
      .select("id,title,user_id,status")
      .eq("id", input.listingId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (listingError || !listing)
      return result({ error: "listing_unavailable" }, 404);
    if (input.action === "status") {
      const { data: settings } = await db
        .from("member_billing_settings")
        .select("enabled,provider_ready")
        .eq("singleton", true)
        .single();
      return result({
        configured: Boolean(
          settings?.enabled &&
          settings.provider_ready &&
          process.env.ASAAS_API_KEY &&
          process.env.ASAAS_WEBHOOK_TOKEN,
        ),
        monthlyCents: 15000,
        order: projection(await currentOrder(db, listing.id, user.id)),
      });
    }
    if (input.action === "cancel") {
      const o = await currentOrder(db, listing.id, user.id);
      if (o && !["cancelled", "failed"].includes(o.status)) {
        const { error } = await db
          .from("member_listing_billing")
          .update({
            status: "cancel_pending",
            cancel_requested_at: new Date().toISOString(),
            next_attempt_at: new Date().toISOString(),
          })
          .eq("id", o.id);
        if (error) throw new Error("billing_unavailable");
        // Removing visibility does not depend on the payment provider being online.
        await db.rpc("member_billing_dispatch");
      }
      return result({
        order: projection(await currentOrder(db, listing.id, user.id)),
      });
    }
    if (
      !input.method ||
      !input.document ||
      !validBillingDocument(input.document)
    )
      return result({ error: "billing_document_invalid" }, 400);
    if (!process.env.ASAAS_API_KEY || !process.env.ASAAS_WEBHOOK_TOKEN)
      return result({ error: "billing_unavailable" }, 503);
    const { data: reserved, error: reserveError } = await db.rpc(
      "member_billing_checkout",
      {
        p_actor: user.id,
        p_id: listing.id,
        p_method: input.method,
        p_contact: input.contactConsent === true,
        p_monthly: input.monthlyAccepted === true,
      },
    );
    if (reserveError)
      return result(
        {
          error:
            [
              "identity_verification_required",
              "listing_incomplete",
              "billing_unavailable",
              "billing_consent_required",
            ].find((code) => reserveError.message.includes(code)) ??
            "billing_unavailable",
        },
        409,
      );
    const order = reserved as BillingOrder & { reserved: boolean };
    if (!order.reserved) return result({ order: projection(order) });
    const api = provider();
    let createdResource = false;
    let financialStage = false;
    try {
      let customerId: string | undefined;
      const { data: stored } = await db
        .from("member_billing_customers")
        .select("asaas_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();
      customerId = stored?.asaas_customer_id;
      if (customerId) {
        if (!providerId(customerId))
          throw new Error("billing_customer_invalid");
        const storedCustomer = await api.call<{
          externalReference: string;
          cpfCnpj: string;
        }>(`/customers/${customerId}`);
        if (
          storedCustomer.externalReference !== user.id ||
          storedCustomer.cpfCnpj.replace(/\D/g, "") !==
            input.document.replace(/\D/g, "")
        )
          throw new Error("billing_document_changed");
      }
      if (!customerId) {
        const found = await api.call<{
          data: Array<{
            id: string;
            externalReference: string;
            cpfCnpj: string;
          }>;
        }>(
          `/customers?externalReference=${encodeURIComponent(user.id)}&limit=2`,
        );
        if (found.data.length > 1)
          throw new Error("billing_customer_ambiguous");
        if (
          found.data.length &&
          found.data[0].cpfCnpj.replace(/\D/g, "") !==
            input.document.replace(/\D/g, "")
        )
          throw new Error("billing_document_changed");
        const { data: profile } = await db
          .from("member_profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .single();
        customerId =
          found.data[0]?.id ??
          (
            await api.call<{ id: string }>("/customers", "POST", {
              name: profile?.display_name,
              email: user.email,
              cpfCnpj: input.document.replace(/\D/g, ""),
              externalReference: user.id,
              notificationDisabled: true,
            })
          ).id;
        if (!providerId(customerId)) throw new AsaasFault(503, true);
        const { error } = await db
          .from("member_billing_customers")
          .upsert(
            { user_id: user.id, asaas_customer_id: customerId },
            { onConflict: "user_id" },
          );
        if (error) throw new AsaasFault(503, true);
      }
      const { error: customerError } = await db
        .from("member_listing_billing")
        .update({ customer_id: customerId })
        .eq("id", order.id);
      if (customerError) throw new AsaasFault(503, true);
      const day = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      let saved: Record<string, unknown>;
      const { data: started, error: startError } = await db
        .from("member_listing_billing")
        .update({ financial_started: true })
        .eq("id", order.id)
        .eq("status", "creating")
        .select("id");
      if (startError) throw new AsaasFault(503);
      if (!started?.length) throw new Error("billing_cancelled");
      financialStage = true;
      if (input.method === "card") {
        const subscription = await api.call<{ id: string }>(
          "/subscriptions",
          "POST",
          {
            customer: customerId,
            billingType: "CREDIT_CARD",
            value: 150,
            nextDueDate: day,
            cycle: "MONTHLY",
            externalReference: order.id,
            description: `Anúncio mensal Vitale: ${listing.title}`.slice(
              0,
              500,
            ),
            callback: {
              successUrl: "https://vitalemobilidade.com/conta/anuncios",
              autoRedirect: true,
            },
          },
        );
        createdResource = true;
        if (!providerId(subscription.id)) throw new AsaasFault(503, true);
        // Persist the created resource before any later operation can fail.
        const { error } = await db
          .from("member_listing_billing")
          .update({ subscription_id: subscription.id })
          .eq("id", order.id);
        if (error) throw new AsaasFault(503, true);
        const payments = await api.call<{
          data: Array<{ invoiceUrl: string }>;
        }>(`/subscriptions/${subscription.id}/payments?limit=1`);
        const url = safeAsaasPaymentUrl(payments.data[0]?.invoiceUrl);
        if (!url) throw new AsaasFault(503, true);
        saved = { payment_url: url };
      } else {
        const authorization = await api.call<{
          id: string;
          payload: string;
          encodedImage: string;
          immediateQrCode: {
            conciliationIdentifier: string;
            expirationDate: string;
          };
          subscriptionId?: string;
        }>("/pix/automatic/authorizations", "POST", {
          frequency: "MONTHLY",
          contractId: order.id.replaceAll("-", ""),
          startDate: day,
          value: 150,
          description: "Anuncio mensal Vitale Mobilidade",
          customerId,
          paymentCreationMode: "SUBSCRIPTION",
          retryPolicy: "NOT_ALLOWED",
          immediateQrCode: {
            expirationSeconds: 3600,
            originalValue: 150,
            description: `Anuncio Vitale ${order.id.slice(0, 8)}`,
          },
        });
        createdResource = true;
        if (
          !providerId(authorization.id) ||
          !authorization.payload ||
          !authorization.immediateQrCode?.conciliationIdentifier
        )
          throw new AsaasFault(503, true);
        saved = {
          authorization_id: authorization.id,
          subscription_id: authorization.subscriptionId ?? null,
          conciliation_id: authorization.immediateQrCode.conciliationIdentifier,
          pix_payload: authorization.payload,
          pix_image: /^[A-Za-z0-9+/=]+$/.test(authorization.encodedImage ?? "")
            ? authorization.encodedImage
            : null,
          qr_expires_at: new Date(Date.now() + 3600000).toISOString(),
          renewal_status: "CREATED",
        };
      }
      // Save resource identifiers even if withdrawal happened during the Asaas request.
      await saveOrder(db, order.id, saved);
      const { error } = await db
        .from("member_listing_billing")
        .update({
          status: "pending",
          lease_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .eq("status", "creating");
      if (error) throw new AsaasFault(503, true);
      // If the owner withdrew during the provider request, the durable cancellation is retained.
      await db.rpc("member_billing_dispatch");
      return result({
        order: projection(await currentOrder(db, listing.id, user.id)),
      });
    } catch (failure) {
      const uncertain =
        financialStage &&
        (createdResource ||
          (failure instanceof AsaasFault && failure.uncertain));
      if (uncertain)
        await saveOrder(db, order.id, { error_code: "creation_uncertain" });
      await db
        .from("member_listing_billing")
        .update({
          status: uncertain ? "uncertain" : "failed",
          error_code: uncertain ? "creation_uncertain" : "provider_rejected",
          lease_until: null,
        })
        .eq("id", order.id)
        .eq("status", "creating");
      return result(
        {
          error: uncertain ? "billing_uncertain" : "billing_provider_rejected",
          order: projection(await currentOrder(db, listing.id, user.id)),
        },
        503,
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return result({ error: "invalid_input" }, 400);
    return result({ error: "billing_unavailable" }, 503);
  }
}
export function validAsaasWebhookToken(
  received: string | null,
  expected: string | undefined,
): boolean {
  if (!received || !expected || expected.length < 32 || received.length > 256)
    return false;
  const a = Buffer.from(received),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function asaasListingWebhook(request: Request) {
  if (
    !validAsaasWebhookToken(
      request.headers.get("asaas-access-token"),
      process.env.ASAAS_WEBHOOK_TOKEN,
    )
  )
    return result({ error: "forbidden" }, 403);
  try {
    const raw = await request.text();
    if (raw.length > 64000) return result({ error: "too_large" }, 413);
    const body = JSON.parse(raw);
    if (!providerId(body.id) || typeof body.event !== "string")
      return result({ error: "invalid_event" }, 400);
    const type = body.event.startsWith("PAYMENT_")
      ? "payment"
      : body.event.startsWith("SUBSCRIPTION_")
        ? "subscription"
        : body.event.includes("AUTHORIZATION_")
          ? "authorization"
          : body.event.includes("PAYMENT_INSTRUCTION_")
            ? "instruction"
            : null;
    const id =
      type === "payment"
        ? body.payment?.id
        : type === "subscription"
          ? body.subscription?.id
          : type === "authorization"
            ? body.authorization?.id
            : type === "instruction"
              ? body.paymentInstruction?.id
              : null;
    if (!type || !providerId(id)) return result({ ok: true, ignored: true });
    const db = database();
    const { data, error } = await db
      .from("member_billing_events")
      .upsert(
        {
          id: body.id,
          kind: body.event.slice(0, 120),
          resource_id: id,
          resource_type: type,
        },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .select("id");
    if (error) return result({ error: "retry" }, 503);
    if (data?.length) await db.rpc("member_billing_dispatch");
    return result({ ok: true });
  } catch {
    return result({ error: "retry" }, 503);
  }
}

type BillingEvent = {
  id: string;
  resource_id: string;
  resource_type: string;
  lease_token: string;
  attempts: number;
};
async function saveOrder(db: Db, id: string, patch: Record<string, unknown>) {
  const { error } = await db
    .from("member_listing_billing")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error("billing_unavailable");
}
async function orderBy(
  db: Db,
  key: string,
  value: unknown,
): Promise<BillingOrder | null> {
  if (typeof value !== "string" || !value) return null;
  const { data, error } = await db
    .from("member_listing_billing")
    .select("*")
    .eq(key, value)
    .maybeSingle();
  if (error) throw new Error("billing_unavailable");
  return data as BillingOrder | null;
}
export async function reconcilePayment(
  db: Db,
  api: AsaasClient,
  id: string,
  known?: BillingOrder,
  allowUnmapped = false,
) {
  const observed = new Date().toISOString();
  const p = await api.call<Record<string, unknown>>(`/payments/${id}`);
  let order = known ?? (await orderBy(db, "subscription_id", p.subscription));
  if (!order && uuid.safeParse(p.externalReference).success)
    order = await orderBy(db, "id", p.externalReference);
  if (!order && p.billingType === "PIX" && providerId(p.pixTransaction)) {
    const transaction = await api.call<Record<string, unknown>>(
      `/pix/transactions/${p.pixTransaction}`,
    );
    order = await orderBy(
      db,
      "conciliation_id",
      transaction.conciliationIdentifier,
    );
  }
  if (!order) {
    // A financial event may beat the checkout response that stores provider IDs.
    if (!allowUnmapped) throw new Error("billing_mapping_pending");
    return;
  }
  if (
    p.id !== id ||
    p.customer !== order.customer_id ||
    Number(p.value) !== 150 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(String(p.dueDate))
  )
    throw new Error("billing_mismatch");
  if (
    order.method === "card" &&
    (p.billingType !== "CREDIT_CARD" ||
      p.subscription !== order.subscription_id)
  )
    throw new Error("billing_mismatch");
  if (order.method === "pix_automatic" && p.billingType !== "PIX")
    throw new Error("billing_mismatch");
  const risk =
    p.chargeback &&
    typeof p.chargeback === "object" &&
    ["REQUESTED", "DISPUTE"].includes(
      String((p.chargeback as Record<string, unknown>).status),
    );
  const status = risk ? "CHARGEBACK_REQUESTED" : String(p.status);
  const { error } = await db.rpc("member_billing_record_payment", {
    p_order: order.id,
    p_payment: id,
    p_status: status,
    p_paid: !risk && paidAsaasCycle(p),
    p_due: p.dueDate,
    p_observed: observed,
  });
  if (error) throw new Error("billing_unavailable");
}
export async function reconcileEvent(
  db: Db,
  api: AsaasClient,
  e: BillingEvent,
) {
  if (e.resource_type === "payment")
    return reconcilePayment(db, api, e.resource_id, undefined, e.attempts > 5);
  if (e.resource_type === "instruction") {
    const instruction = await api.call<{
      paymentId?: string;
      authorization?: { id: string };
    }>(`/pix/automatic/paymentInstructions/${e.resource_id}`);
    const order = await orderBy(
      db,
      "authorization_id",
      instruction.authorization?.id,
    );
    if (!order && e.attempts <= 5) throw new Error("billing_mapping_pending");
    if (order && providerId(instruction.paymentId))
      await reconcilePayment(db, api, instruction.paymentId!, order);
    return;
  }
  if (e.resource_type === "authorization") {
    const authorization = await api.call<Record<string, unknown>>(
      `/pix/automatic/authorizations/${e.resource_id}`,
    );
    const order = await orderBy(db, "authorization_id", e.resource_id);
    if (!order) {
      if (e.attempts <= 5) throw new Error("billing_mapping_pending");
      return;
    }
    if (
      authorization.id !== order.authorization_id ||
      authorization.customerId !== order.customer_id ||
      authorization.contractId !== order.id.replaceAll("-", "") ||
      Number(authorization.value) !== 150 ||
      authorization.frequency !== "MONTHLY" ||
      authorization.paymentCreationMode !== "SUBSCRIPTION"
    )
      throw new Error("billing_mismatch");
    await saveOrder(db, order.id, {
      renewal_status: authorization.status,
      ...(providerId(authorization.subscriptionId)
        ? { subscription_id: authorization.subscriptionId }
        : {}),
    });
    // Activation is not a payment: it never grants publication here.
    if (
      !["cancelled", "failed"].includes(order.status) &&
      ["CANCELLED", "EXPIRED"].includes(String(authorization.status))
    )
      await saveOrder(db, order.id, {
        status: "cancel_pending",
        cancel_requested_at: new Date().toISOString(),
        next_attempt_at: new Date().toISOString(),
      });
    return;
  }
  const order = await orderBy(db, "subscription_id", e.resource_id);
  if (!order) {
    if (e.attempts <= 5) throw new Error("billing_mapping_pending");
    return;
  }
  let subscription: Record<string, unknown>;
  try {
    subscription = await api.call<Record<string, unknown>>(
      `/subscriptions/${e.resource_id}`,
    );
  } catch (failure) {
    if (!(failure instanceof AsaasFault && failure.status === 404))
      throw failure;
    await saveOrder(db, order.id, {
      status: "cancel_pending",
      cancel_requested_at: new Date().toISOString(),
      next_attempt_at: new Date().toISOString(),
    });
    return;
  }
  if (
    subscription.customer !== order.customer_id ||
    Number(subscription.value) !== 150 ||
    subscription.cycle !== "MONTHLY"
  )
    throw new Error("billing_mismatch");
  if (
    !["cancelled", "failed"].includes(order.status) &&
    (subscription.deleted === true || subscription.status === "INACTIVE")
  )
    await saveOrder(db, order.id, {
      status: "cancel_pending",
      cancel_requested_at: new Date().toISOString(),
      next_attempt_at: new Date().toISOString(),
    });
}
export async function cancelOrder(
  db: Db,
  api: AsaasClient,
  order: BillingOrder,
) {
  // Recover an Asaas response lost between financial creation and saving its ID.
  if (!order.subscription_id && !order.authorization_id) {
    if (order.method === "card") {
      const found = await api.call<{ data: Array<Record<string, unknown>> }>(
        `/subscriptions?externalReference=${order.id}&limit=2`,
      );
      const matches = found.data.filter(
        (s) =>
          s.externalReference === order.id &&
          s.customer === order.customer_id &&
          Number(s.value) === 150 &&
          s.cycle === "MONTHLY",
      );
      if (matches.length > 1) throw new Error("billing_ambiguous");
      if (matches[0] && providerId(matches[0].id))
        order.subscription_id = String(matches[0].id);
    } else if (order.customer_id) {
      const found = await api.call<{ data: Array<Record<string, unknown>> }>(
        `/pix/automatic/authorizations?customerId=${order.customer_id}&limit=100`,
      );
      const matches = found.data.filter(
        (a) =>
          a.contractId === order.id.replaceAll("-", "") &&
          a.customerId === order.customer_id &&
          Number(a.value) === 150 &&
          a.frequency === "MONTHLY",
      );
      if (matches.length > 1) throw new Error("billing_ambiguous");
      if (matches[0] && providerId(matches[0].id)) {
        order.authorization_id = String(matches[0].id);
        if (providerId(matches[0].subscriptionId))
          order.subscription_id = String(matches[0].subscriptionId);
      }
    }
    if (order.subscription_id || order.authorization_id)
      await saveOrder(db, order.id, {
        subscription_id: order.subscription_id,
        authorization_id: order.authorization_id,
      });
    // Never assume a timed-out creation failed: retain a visible support/retry state.
    else if (order.financial_started) throw new Error("billing_uncertain");
  }
  if (order.authorization_id)
    await api.call(
      `/pix/automatic/authorizations/${order.authorization_id}`,
      "DELETE",
    );
  if (order.subscription_id)
    await api.call(`/subscriptions/${order.subscription_id}`, "DELETE");
  const { error } = await db
    .from("member_listing_billing")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      lease_until: null,
      lease_token: null,
      error_code: null,
      pix_payload: null,
      pix_image: null,
    })
    .eq("id", order.id)
    .eq("lease_token", order.lease_token)
    .eq("status", "cancel_pending");
  if (error) throw new Error("billing_unavailable");
}
async function recoverOrder(db: Db, api: AsaasClient, order: BillingOrder) {
  const found =
    order.method === "card"
      ? await api.call<{ data: Array<Record<string, unknown>> }>(
          `/subscriptions?externalReference=${order.id}&limit=2`,
        )
      : await api.call<{ data: Array<Record<string, unknown>> }>(
          `/pix/automatic/authorizations?customerId=${order.customer_id}&limit=100`,
        );
  const matches = found.data.filter((r) =>
    order.method === "card"
      ? r.externalReference === order.id &&
        r.customer === order.customer_id &&
        Number(r.value) === 150 &&
        r.cycle === "MONTHLY"
      : r.contractId === order.id.replaceAll("-", "") &&
        r.customerId === order.customer_id &&
        Number(r.value) === 150 &&
        r.frequency === "MONTHLY",
  );
  if (matches.length !== 1 || !providerId(matches[0].id))
    throw new Error("billing_uncertain");
  const resource = matches[0];
  if (order.method === "card") {
    await saveOrder(db, order.id, { subscription_id: resource.id });
    const payments = await api.call<{ data: Array<{ invoiceUrl: string }> }>(
      `/subscriptions/${resource.id}/payments?limit=1`,
    );
    const url = safeAsaasPaymentUrl(payments.data[0]?.invoiceUrl);
    if (!url) throw new Error("billing_uncertain");
    await saveOrder(db, order.id, { payment_url: url });
  } else {
    await saveOrder(db, order.id, {
      authorization_id: resource.id,
      ...(providerId(resource.subscriptionId)
        ? { subscription_id: resource.subscriptionId }
        : {}),
    });
    // A lost QR response cannot safely be regenerated. Cancel this authorization before a new attempt.
    await saveOrder(db, order.id, {
      status: "cancel_pending",
      cancel_requested_at: new Date().toISOString(),
      next_attempt_at: new Date().toISOString(),
    });
    return;
  }
  const { error } = await db
    .from("member_listing_billing")
    .update({
      status: "pending",
      error_code: null,
      lease_token: null,
      lease_until: null,
    })
    .eq("id", order.id)
    .eq("lease_token", order.lease_token)
    .eq("status", "uncertain");
  if (error) throw new Error("billing_unavailable");
}
export async function listingBillingWorker(request: Request) {
  try {
    const db = database();
    const { data: authorized, error } = await db.rpc(
      "member_billing_authorize",
      {
        signature: request.headers.get("x-worker-signature"),
        issued_at: request.headers.get("x-worker-issued-at"),
      },
    );
    if (error || authorized !== true)
      return result({ error: "forbidden" }, 403);
    if (!process.env.ASAAS_API_KEY || !process.env.ASAAS_WEBHOOK_TOKEN)
      return result({ ok: false, configured: false }, 503);
    const api = provider();
    const { data: health } = await db
      .from("member_billing_settings")
      .select("last_health_at,provider_ready")
      .eq("singleton", true)
      .single();
    if (
      !health?.last_health_at ||
      Date.now() - Date.parse(health.last_health_at) >
        (health.provider_ready ? 3600000 : 60000)
    ) {
      try {
        await api.call("/paymentLinks?limit=1");
        await db
          .from("member_billing_settings")
          .update({
            provider_ready: true,
            last_health_at: new Date().toISOString(),
          })
          .eq("singleton", true);
      } catch {
        await db
          .from("member_billing_settings")
          .update({
            provider_ready: false,
            last_health_at: new Date().toISOString(),
          })
          .eq("singleton", true);
        return result({ ok: false, providerConnected: false }, 503);
      }
    }
    await db.rpc("member_billing_expire_periods");
    const { data: cancellations, error: cancelError } = await db.rpc(
      "member_billing_claim_cancellations",
    );
    if (cancelError) throw cancelError;
    for (const order of (cancellations ?? []) as BillingOrder[]) {
      try {
        await cancelOrder(db, api, order);
      } catch {
        await db
          .from("member_listing_billing")
          .update({
            lease_until: null,
            lease_token: null,
            error_code: "cancellation_retry",
            next_attempt_at: new Date(
              Date.now() +
                Math.min(3600000, 60000 * 2 ** Math.min(order.attempts, 5)),
            ).toISOString(),
          })
          .eq("id", order.id)
          .eq("lease_token", order.lease_token);
      }
    }
    const { data: recoveries } = await db.rpc("member_billing_claim_uncertain");
    for (const order of (recoveries ?? []) as BillingOrder[]) {
      try {
        await recoverOrder(db, api, order);
      } catch {
        await db
          .from("member_listing_billing")
          .update({
            lease_until: null,
            lease_token: null,
            next_attempt_at: new Date(Date.now() + 300000).toISOString(),
          })
          .eq("id", order.id)
          .eq("lease_token", order.lease_token);
      }
    }
    const { data: events, error: claimError } = await db.rpc(
      "member_billing_claim_events",
    );
    if (claimError) throw claimError;
    let processed = 0;
    for (const event of (events ?? []) as BillingEvent[]) {
      try {
        await reconcileEvent(db, api, event);
        const { error } = await db
          .from("member_billing_events")
          .update({ status: "done", lease_until: null, lease_token: null })
          .eq("id", event.id)
          .eq("lease_token", event.lease_token);
        if (error) throw error;
        processed++;
      } catch {
        await db
          .from("member_billing_events")
          .update({
            status: "pending",
            lease_until: null,
            lease_token: null,
            available_at: new Date(
              Date.now() +
                Math.min(3600000, 60000 * 2 ** Math.min(event.attempts, 5)),
            ).toISOString(),
          })
          .eq("id", event.id)
          .eq("lease_token", event.lease_token);
      }
    }
    return result({ ok: true, providerConnected: true, processed });
  } catch {
    return result({ error: "billing_unavailable" }, 503);
  }
}
