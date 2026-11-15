const base = () => process.env.PEY_API_BASE ?? "https://api.pey.mx";

function apiKey(): string {
  const key = process.env.PEY_API_KEY;
  if (!key) throw new Error("Missing PEY_API_KEY");
  return key;
}

export type CreateQrInput = {
  amount: number;
  concept: string;
  expiration: number;
  numRef: string;
  generateImage?: boolean;
  bankAccountId?: string;
  metadata?: Record<string, unknown>;
};

export type CreateQrResponse = {
  id: string;
  qrString: string;
  qrImage: string | null;
};

export type PeyTransaction = {
  id: string;
  status: "PENDING" | "PAID";
  amount: number;
  currency: string;
  paymentMethod: "CODI" | "CARD";
  description?: string;
  dateCreated?: number;
  datePaid?: number;
};

export type PeyError = {
  error?: {
    message?: string;
    type?: string;
    requestId?: string;
  };
};

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as PeyError;
    const message = body.error?.message ?? res.statusText;
    const requestId = body.error?.requestId ? ` (requestId ${body.error.requestId})` : "";
    return `${res.status} ${message}${requestId}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

export async function createQr(input: CreateQrInput): Promise<CreateQrResponse> {
  const res = await fetch(`${base()}/codi/qr`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amount,
      concept: input.concept,
      expiration: input.expiration,
      numRef: input.numRef,
      generateImage: input.generateImage ?? true,
      ...(input.bankAccountId ? { bankAccountId: input.bankAccountId } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`pey createQr failed: ${await parseError(res)}`);
  return (await res.json()) as CreateQrResponse;
}

export async function getQrTransactions(
  providerQrId: string,
): Promise<{ items: PeyTransaction[] }> {
  const res = await fetch(`${base()}/transaction/codi/qr/${providerQrId}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`pey getQrTransactions failed: ${await parseError(res)}`);
  return (await res.json()) as { items: PeyTransaction[] };
}
