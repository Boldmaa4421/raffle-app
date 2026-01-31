type SendSmsResult =
  | { ok: true; providerMessageId?: string }
  | { ok: false; error: string; statusCode?: number };

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function normalizeE164(input: string) {
  // Already stored as E164 in DB (phoneE164), but just in case:
  const s = input.trim();
  if (s.startsWith("+")) return s;
  if (s.startsWith("976")) return `+${s}`;
  if (/^\d{8}$/.test(s)) return `+976${s}`;
  return s; // fallback
}

export async function sendSms(toE164: string, text: string): Promise<SendSmsResult> {
  const debug = process.env.SMS_DEBUG === "true";

  const provider = process.env.SMS_PROVIDER || "operator_http";
  if (provider !== "operator_http") {
    return { ok: false, error: `Unsupported SMS_PROVIDER=${provider}` };
  }

  const url = requireEnv("SMS_API_URL");
  const apiKey = requireEnv("SMS_API_KEY");
  const sender = process.env.SMS_SENDER || "MB";

  const to = normalizeE164(toE164);

  // ⚠️ SMS уртад анхаар: Unicode бол 70 тэмдэгт/segment (ойролцоо), латин бол 160/segment.
  // Энд богино байлгахыг хичээ.
  const body = {
    to,
    text,
    sender,
  };

  if (debug) {
    console.log("[SMS DEBUG] POST", url, body);
    return { ok: true, providerMessageId: "debug" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Оператор бүр өөр header ашиглаж болно:
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const raw = await res.text();

    if (!res.ok) {
      return { ok: false, error: `SMS API error: ${raw}`, statusCode: res.status };
    }

    // Операторын response JSON байвал parse хийгээд messageId авах боломжтой
    let providerMessageId: string | undefined;
    try {
      const j = JSON.parse(raw);
      providerMessageId = j.messageId || j.id || j.msgid;
    } catch {
      // text response байж болно
      providerMessageId = undefined;
    }

    return { ok: true, providerMessageId };
  } catch (e: any) {
    return { ok: false, error: e?.message || "SMS fetch failed" };
  }
}
