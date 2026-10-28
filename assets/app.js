const API_URL = 'https://fqisewatypluagngmgka.supabase.co/functions/v1/flowboost-order';
const WHATSAPP_NUMBER = '558193028646';

const PACKAGES = Object.freeze({
  100: 4.00,
  250: 7.00,
  500: 12.00,
  1000: 19.90,
  2500: 44.90,
  5000: 74.90,
  10000: 129.90,
});

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const money = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const numberBR = (value) => Number(value).toLocaleString('pt-BR');

const form = $('#orderForm');
const usernameInput = $('#username');
const profileInput = $('#profileUrl');
const quantitySelect = $('#quantity');
const submitButton = $('#submitOrder');
const whatsappButton = $('#whatsappButton');
const modal = $('#modal');
const historyList = $('#historyList');
const toast = $('#toast');

let lastOrder = null;
let toastTimer = null;

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeUsername(value) {
  return String(value || '').trim().replace(/^@+/, '').replace(/[^a-zA-Z0-9._]/g, '').slice(0, 30);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function getSelectedQuantity() {
  const quantity = Number(quantitySelect.value);
  return PACKAGES[quantity] !== undefined ? quantity : 1000;
}

function updateSummary(quantity = getSelectedQuantity()) {
  const price = PACKAGES[quantity];
  $('#qtyDisplay').textContent = numberBR(quantity);
  $('#packagePrice').textContent = money(price);
  $('#sumQty').textContent = numberBR(quantity);
  $('#sumPackage').textContent = `${numberBR(quantity)} seguidores`;
  $('#totalPrice').textContent = money(price);
  $('#heroQty').textContent = numberBR(quantity);
  $('#heroPrice').textContent = money(price);
  $$('.package').forEach((card) => card.classList.toggle('active', Number(card.dataset.qty) === quantity));
}

function makeWhatsAppUrl(order) {
  const text = [
    `Novo pedido ${order.code}`,
    `Instagram: @${order.user || 'perfil'}`,
    `Link: ${order.profile || 'Não informado'}`,
    `Quantidade: ${numberBR(order.qty)} seguidores`,
    `Valor: ${money(order.total)}`,
    `Status: ${order.status}`,
  ].join('\n');
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function readOrders() {
  try {
    const parsed = JSON.parse(localStorage.getItem('flowboost_orders') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOrder(order) {
  const orders = readOrders().filter((item) => item.code !== order.code);
  orders.unshift(order);
  localStorage.setItem('flowboost_orders', JSON.stringify(orders.slice(0, 8)));
}

function renderHistory() {
  const orders = readOrders();
  if (!orders.length) {
    historyList.innerHTML = '<div class="empty">Nenhum pedido gerado ainda.</div>';
    return;
  }

  historyList.innerHTML = orders.map((order) => `
    <div class="history-item">
      <div><strong>${escapeHtml(order.code)}</strong><div class="history-meta">@${escapeHtml(order.user || 'perfil')}</div></div>
      <div class="hide-sm">${numberBR(order.qty)} seguidores</div>
      <div class="hide-sm">${money(order.total)}</div>
      <span class="status">${escapeHtml(order.status || 'AGUARDANDO')}</span>
    </div>
  `).join('');
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.innerHTML = isLoading ? 'Salvando pedido…' : 'Gerar pedido <span>→</span>';
}

function openSuccessModal(order) {
  const whatsappUrl = makeWhatsAppUrl(order);
  $('#orderCode').textContent = order.code;
  $('#modalDetails').innerHTML = `
    <strong>@${escapeHtml(order.user || 'perfil')}</strong><br>
    ${numberBR(order.qty)} seguidores • ${money(order.total)}<br>
    Status: ${escapeHtml(order.status)}<br>
    E-mail: ${escapeHtml(order.emailStatus || 'PENDENTE')}<br><br>
    <a href="${whatsappUrl}" target="_blank" rel="noopener">Enviar este pedido pelo WhatsApp →</a>
  `;
  whatsappButton.href = whatsappUrl;
  whatsappButton.classList.remove('hidden');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

async function createOrder(event) {
  event.preventDefault();

  const user = normalizeUsername(usernameInput.value);
  const profile = profileInput.value.trim();
  const quantity = getSelectedQuantity();

  if (!user && !profile) {
    usernameInput.focus();
    showToast('Informe o @ do Instagram ou o link do perfil.');
    return;
  }

  if (profile && !/^https?:\/\/(www\.)?instagram\.com\//i.test(profile)) {
    profileInput.focus();
    showToast('Use um link válido do Instagram.');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instagram_user: user,
        profile_url: profile,
        quantity,
      }),
    });

    let payload = {};
    try { payload = await response.json(); } catch { payload = {}; }

    if (!response.ok || !payload.ok || !payload.order) {
      throw new Error(payload.error || 'Não foi possível gerar o pedido.');
    }

    const serverOrder = payload.order;
    const order = {
      code: serverOrder.code,
      user: serverOrder.instagram_user || user || 'perfil',
      profile: serverOrder.profile_url || profile || '',
      qty: Number(serverOrder.quantity),
      total: Number(serverOrder.total),
      status: serverOrder.status || 'AGUARDANDO',
      emailStatus: serverOrder.email_status || 'PENDENTE',
      createdAt: new Date().toISOString(),
    };

    lastOrder = order;
    saveOrder(order);
    renderHistory();
    openSuccessModal(order);
    showToast('Pedido salvo no Supabase.');
  } catch (error) {
    console.error(error);
    showToast(error?.message || 'Falha ao conectar com o servidor.');
  } finally {
    setLoading(false);
  }
}

usernameInput.addEventListener('input', () => {
  const clean = normalizeUsername(usernameInput.value);
  if (clean && (!profileInput.value.trim() || profileInput.dataset.auto === 'true')) {
    profileInput.value = `https://instagram.com/${clean}`;
    profileInput.dataset.auto = 'true';
  }
});

profileInput.addEventListener('input', (event) => {
  if (event.isTrusted) profileInput.dataset.auto = 'false';
});

quantitySelect.addEventListener('change', () => updateSummary());

$$('.package').forEach((card) => {
  card.addEventListener('click', () => {
    const quantity = Number(card.dataset.qty);
    quantitySelect.value = String(quantity);
    updateSummary(quantity);
    $('#pedido').scrollIntoView({ behavior: 'smooth' });
  });
});

form.addEventListener('submit', createOrder);

$('#closeModal').addEventListener('click', () => {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
});

modal.addEventListener('click', (event) => {
  if (event.target === modal) $('#closeModal').click();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal.classList.contains('open')) $('#closeModal').click();
});

$('#copyOrder').addEventListener('click', async () => {
  if (!lastOrder) return;
  const text = [
    `Pedido ${lastOrder.code}`,
    `Instagram: @${lastOrder.user}`,
    `Link: ${lastOrder.profile || 'Não informado'}`,
    `Quantidade: ${numberBR(lastOrder.qty)} seguidores`,
    `Total: ${money(lastOrder.total)}`,
    `Status: ${lastOrder.status}`,
  ].join('\n');
  try {
    await navigator.clipboard.writeText(text);
    showToast('Resumo copiado.');
  } catch {
    showToast('Não foi possível copiar automaticamente.');
  }
});

$('#clearOrders').addEventListener('click', () => {
  localStorage.removeItem('flowboost_orders');
  renderHistory();
  showToast('Histórico local limpo.');
});

updateSummary(1000);
renderHistory();
