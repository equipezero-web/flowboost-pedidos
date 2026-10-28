const PACKAGES = new Map<number, number>([
  [100, 400],
  [250, 700],
  [500, 1200],
  [1000, 1990],
  [2500, 4490],
  [5000, 7490],
  [10000, 12990],
]);

const DESTINATION_EMAIL = 'deividdanilo15@gmail.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function normalizeUsername(value: unknown) {
  return String(value ?? '')
    .trim()
    .replace(/^@+/, '')
    .replace(/[^a-zA-Z0-9._]/g, '')
    .slice(0, 30);
}

function normalizeProfileUrl(value: unknown, username: string) {
  const raw = String(value ?? '').trim();
  if (!raw && username) return `https://instagram.com/${username}`;
  if (!raw) return '';
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    if (host !== 'instagram.com') return '';
    return url.toString().slice(0, 500);
  } catch {
    return '';
  }
}

function makeCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return 'FB-' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function getSecretKey() {
  const modern = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (modern) {
    try {
      const keys = JSON.parse(modern);
      if (keys?.default) return keys.default as string;
    } catch (_) {}
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

async function emailOrder(order: any) {
  try {
    const fd = new FormData();
    fd.append('_subject', `Novo pedido ${order.code} - FlowBoost`);
    fd.append('_captcha', 'false');
    fd.append('_template', 'table');
    fd.append('Código do pedido', order.code);
    fd.append('Instagram', order.instagram_user ? `@${order.instagram_user}` : 'Não informado');
    fd.append('Link do perfil', order.profile_url || 'Não informado');
    fd.append('Quantidade', `${Number(order.quantity).toLocaleString('pt-BR')} seguidores`);
    fd.append('Valor', (Number(order.total_cents) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    fd.append('Status', order.status);

    const response = await fetch(`https://formsubmit.co/ajax/${DESTINATION_EMAIL}`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: fd,
    });
    return response.ok;
  } catch (error) {
    console.error('Email forwarding failed', error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Método não permitido.' }, 405);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'JSON inválido.' }, 400);
  }

  const quantity = Number(body?.quantity);
  const totalCents = PACKAGES.get(quantity);
  if (!totalCents) return json({ ok: false, error: 'Pacote inválido.' }, 400);

  const username = normalizeUsername(body?.instagram_user ?? body?.user);
  const suppliedProfile = String(body?.profile_url ?? body?.profile ?? '').trim();
  const profileUrl = normalizeProfileUrl(suppliedProfile, username);
  if (suppliedProfile && !profileUrl) {
    return json({ ok: false, error: 'Informe um link válido do Instagram.' }, 400);
  }
  if (!username && !profileUrl) {
    return json({ ok: false, error: 'Informe o usuário ou o link do perfil.' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const secretKey = getSecretKey();
  if (!supabaseUrl || !secretKey) {
    console.error('Missing Supabase environment secrets');
    return json({ ok: false, error: 'Backend indisponível.' }, 500);
  }

  const cutoff = new Date(Date.now() - 30_000).toISOString();
  const duplicateField = username ? 'instagram_user' : 'profile_url';
  const duplicateValue = username || profileUrl;
  const duplicateUrl = new URL(`${supabaseUrl}/rest/v1/flowboost_orders`);
  duplicateUrl.searchParams.set('select', 'code');
  duplicateUrl.searchParams.set(duplicateField, `eq.${duplicateValue}`);
  duplicateUrl.searchParams.set('quantity', `eq.${quantity}`);
  duplicateUrl.searchParams.set('created_at', `gte.${cutoff}`);
  duplicateUrl.searchParams.set('limit', '1');

  const duplicateCheck = await fetch(duplicateUrl, { headers: { 'apikey': secretKey } });
  if (duplicateCheck.ok) {
    const recent = await duplicateCheck.json();
    if (Array.isArray(recent) && recent.length) {
      return json({ ok: false, error: 'Este pedido acabou de ser enviado. Aguarde alguns segundos para tentar novamente.' }, 429);
    }
  }

  const code = makeCode();
  const payload = {
    code,
    instagram_user: username || null,
    profile_url: profileUrl || null,
    quantity,
    total_cents: totalCents,
    status: 'AGUARDANDO',
    email_status: 'PENDENTE',
    source: 'website',
  };

  const insert = await fetch(`${supabaseUrl}/rest/v1/flowboost_orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': secretKey,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(payload),
  });

  if (!insert.ok) {
    console.error('Database insert failed', insert.status, await insert.text());
    return json({ ok: false, error: 'Não foi possível salvar o pedido.' }, 500);
  }

  const rows = await insert.json();
  const row = rows?.[0] ?? payload;
  const emailAccepted = await emailOrder(row);

  const patch = await fetch(`${supabaseUrl}/rest/v1/flowboost_orders?code=eq.${encodeURIComponent(row.code)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': secretKey,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      email_status: emailAccepted ? 'ENVIADO' : 'FALHOU',
      updated_at: new Date().toISOString(),
    }),
  });
  if (!patch.ok) console.error('Could not update email status', await patch.text());

  return json({
    ok: true,
    order: {
      code: row.code,
      instagram_user: row.instagram_user ?? '',
      profile_url: row.profile_url ?? '',
      quantity: row.quantity,
      total_cents: row.total_cents,
      total: Number(row.total_cents) / 100,
      status: row.status,
      email_status: emailAccepted ? 'ENVIADO' : 'FALHOU',
    },
  }, 201);
});
