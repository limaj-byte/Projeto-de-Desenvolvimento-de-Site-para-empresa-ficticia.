(function () {
  "use strict";

  const DB_KEY = "technovaStoreDb";
  const CART_KEY = "carrinhoTechNova";
  const SESSION_KEY = "technovaSession";
  const STATUS = ["Pendente", "Confirmado", "Em preparação", "Pronto para retirada", "Concluído", "Cancelado"];
  const INITIAL_PRODUCTS = [
    { id: "TN-SM-001", name: "Smartphone TechPhone X", category: "Smartphones", priceCents: 249990, image: "Images/computadores.png", description: "Smartphone com tela de alta qualidade e ótimo desempenho.", stock: 10 },
    { id: "TN-FN-002", name: "Fone Bluetooth TechSound", category: "Áudio", priceCents: 29990, image: "Images/headset_gamer.png", description: "Fone Bluetooth com conexão sem fio e som de qualidade.", stock: 20 },
    { id: "TN-TC-003", name: "Teclado Mecânico TechKeys", category: "Periféricos", priceCents: 44990, image: "Images/teclado.png", description: "Teclado mecânico ideal para digitação e jogos.", stock: 15 },
  ];
  let currentUser = null;
  let products = [];

  function loadDb() {
    try {
      const stored = JSON.parse(localStorage.getItem(DB_KEY) || "null");
      if (stored && Array.isArray(stored.products) && Array.isArray(stored.users) && Array.isArray(stored.orders)) return stored;
    } catch (_) { /* Recria dados locais inválidos do protótipo. */ }
    const fresh = { products: INITIAL_PRODUCTS, users: [], orders: [] };
    saveDb(fresh);
    return fresh;
  }

  function saveDb(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

  function readCart() {
    try {
      const value = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      if (!Array.isArray(value)) return [];
      return value.map((item) => ({ id: String(item.id || ""), quantity: Number(item.quantity) }))
        .filter((item) => item.id && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99);
    } catch (_) { return []; }
  }

  function writeCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
  }

  function formatMoney(cents) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function message(text, type = "info") {
    const target = document.querySelector("[data-store-message]") || document.getElementById("mensagem-produto");
    if (!target) return;
    target.textContent = text;
    target.dataset.type = type;
    target.setAttribute("role", type === "error" ? "alert" : "status");
  }

  function sessionUser() {
    try {
      const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
      if (!session) return null;
      return loadDb().users.find((user) => user.id === session.userId) || null;
    } catch (_) { return null; }
  }

  function updateCartBadge() {
    const count = readCart().reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById("cart-count");
    if (badge) badge.textContent = String(count);
  }

  function base64(bytes) { return btoa(String.fromCharCode(...new Uint8Array(bytes))); }

  async function passwordDigest(password, salt) {
    if (!crypto.subtle) throw new Error("Abra a loja em localhost pelo Live Server para habilitar o armazenamento local seguro.");
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" }, key, 256);
    return base64(bits);
  }

  async function initAuth() {
    const login = document.getElementById("form-login");
    const register = document.getElementById("form-cadastro");
    if (login) login.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = login.querySelector("button[type=submit]");
      button.disabled = true;
      try {
        const email = document.getElementById("login-email").value.trim().toLowerCase();
        const password = document.getElementById("login-senha").value;
        const user = loadDb().users.find((entry) => entry.email === email);
        if (!user || await passwordDigest(password, Uint8Array.from(atob(user.salt), (c) => c.charCodeAt(0))) !== user.passwordHash) {
          throw new Error("E-mail ou senha incorretos.");
        }
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
        const next = new URLSearchParams(location.search).get("next");
        const allowed = ["checkoutpagamento.html", "profile.html", "produtos.html", "homepage.html"];
        location.href = allowed.includes(next) ? next : "profile.html";
      } catch (error) { message(error.message, "error"); }
      finally { button.disabled = false; }
    });

    if (register) register.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = register.querySelector("button[type=submit]");
      button.disabled = true;
      try {
        const name = document.getElementById("cadastro-nome").value.trim();
        const email = document.getElementById("cadastro-email").value.trim().toLowerCase();
        const password = document.getElementById("cadastro-senha").value;
        if (name.length < 2 || password.length < 8) throw new Error("Informe seu nome e uma senha de pelo menos 8 caracteres.");
        const db = loadDb();
        if (db.users.some((user) => user.email === email)) throw new Error("Já existe uma conta com esse e-mail neste navegador.");
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const user = { id: crypto.randomUUID(), name, email, salt: base64(salt), passwordHash: await passwordDigest(password, salt), role: "customer", createdAt: new Date().toISOString() };
        db.users.push(user);
        saveDb(db);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
        location.href = "profile.html";
      } catch (error) { message(error.message, "error"); }
      finally { button.disabled = false; }
    });
  }

  function renderProducts() {
    const list = document.getElementById("lista-produtos");
    if (!list) return;
    const query = (document.getElementById("pesquisa")?.value || "").trim().toLocaleLowerCase("pt-BR");
    const category = document.getElementById("filtro-categoria")?.value || "";
    const sort = document.getElementById("ordenacao")?.value || "";
    let visible = products.filter((product) => product.name.toLocaleLowerCase("pt-BR").includes(query) && (!category || product.category === category));
    if (sort === "menor") visible.sort((a, b) => a.priceCents - b.priceCents);
    if (sort === "maior") visible.sort((a, b) => b.priceCents - a.priceCents);
    if (sort === "nome") visible.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    list.innerHTML = visible.length ? visible.map((product) => `
      <article class="produto">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" width="200">
        <h2>${escapeHtml(product.name)}</h2>
        <p>SKU: ${escapeHtml(product.id)}</p>
        <p>${escapeHtml(product.category)} · ${product.stock} disponível(is)</p>
        <p>${formatMoney(product.priceCents)}</p>
        <label>Quantidade
          <input type="number" min="1" max="${product.stock}" value="1" data-quantity="${escapeHtml(product.id)}" ${product.stock === 0 ? "disabled" : ""}>
        </label>
        <button type="button" data-add-product="${escapeHtml(product.id)}" ${product.stock === 0 ? "disabled" : ""}>Adicionar ao carrinho</button>
        <button type="button" data-view-product="${escapeHtml(product.id)}">Ver detalhes</button>
      </article>`).join("") : "<p>Nenhum produto encontrado.</p>";
  }

  function initProducts() {
    const list = document.getElementById("lista-produtos");
    if (!list) return;
    products = loadDb().products;
    const query = new URLSearchParams(location.search).get("q");
    if (query) document.getElementById("pesquisa").value = query;
    renderProducts();
    ["pesquisa", "filtro-categoria", "ordenacao"].forEach((id) => {
      const input = document.getElementById(id);
      if (input) input.addEventListener(id === "pesquisa" ? "input" : "change", renderProducts);
    });
    list.addEventListener("click", (event) => {
      const add = event.target.closest("[data-add-product]");
      const detail = event.target.closest("[data-view-product]");
      if (add) {
        const product = products.find((item) => item.id === add.dataset.addProduct);
        const input = list.querySelector(`[data-quantity="${CSS.escape(product.id)}"]`);
        const quantity = Number(input.value);
        const cart = readCart();
        const existing = cart.find((item) => item.id === product.id);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity + (existing?.quantity || 0) > product.stock) {
          message(`Estoque insuficiente. Disponível: ${product.stock} unidade(s).`, "error");
          return;
        }
        if (existing) existing.quantity += quantity;
        else cart.push({ id: product.id, quantity });
        writeCart(cart);
        message(`${product.name} foi adicionado ao carrinho.`, "success");
      }
      if (detail) {
        const product = products.find((item) => item.id === detail.dataset.viewProduct);
        document.getElementById("detalhe-nome").textContent = product.name;
        document.getElementById("detalhe-descricao").textContent = product.description;
        document.getElementById("detalhe-preco").textContent = `${formatMoney(product.priceCents)} · ${product.stock} em estoque`;
        document.getElementById("detalhes-produto").hidden = false;
      }
    });
    document.getElementById("fechar-detalhes").addEventListener("click", () => { document.getElementById("detalhes-produto").hidden = true; });
    updateCartBadge();
  }

  function initCart() {
    const body = document.getElementById("itens-carrinho");
    if (!body) return;
    products = loadDb().products;
    const render = () => {
      const cart = readCart();
      const rows = cart.map((item) => ({ ...item, product: products.find((product) => product.id === item.id) })).filter((item) => item.product);
      if (!rows.length) body.innerHTML = '<tr><td colspan="6">Seu carrinho está vazio. <a href="produtos.html">Voltar à loja</a></td></tr>';
      else body.innerHTML = rows.map(({ id, quantity, product }) => `
        <tr>
          <td><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" width="70"></td>
          <td>${escapeHtml(product.name)}</td><td>${formatMoney(product.priceCents)}</td>
          <td><button type="button" data-cart-minus="${escapeHtml(id)}" aria-label="Diminuir quantidade">−</button> ${quantity}
            <button type="button" data-cart-plus="${escapeHtml(id)}" aria-label="Aumentar quantidade" ${quantity >= product.stock ? "disabled" : ""}>+</button></td>
          <td>${formatMoney(product.priceCents * quantity)}</td>
          <td><button type="button" data-cart-remove="${escapeHtml(id)}">Remover</button></td>
        </tr>`).join("");
      const subtotal = rows.reduce((sum, row) => sum + row.product.priceCents * row.quantity, 0);
      document.getElementById("subtotal").textContent = formatMoney(subtotal);
      document.getElementById("total").textContent = formatMoney(subtotal);
      document.getElementById("finalizar-compra").hidden = rows.length === 0;
      updateCartBadge();
    };
    body.addEventListener("click", (event) => {
      const target = event.target;
      const id = target.dataset.cartPlus || target.dataset.cartMinus || target.dataset.cartRemove;
      if (!id) return;
      let cart = readCart();
      if (target.dataset.cartRemove) cart = cart.filter((item) => item.id !== id);
      else {
        const item = cart.find((entry) => entry.id === id);
        const product = products.find((entry) => entry.id === id);
        if (!item || !product) return;
        item.quantity += target.dataset.cartPlus ? 1 : -1;
        if (item.quantity < 1) cart = cart.filter((entry) => entry.id !== id);
        else if (item.quantity > product.stock) { message(`Estoque disponível: ${product.stock}.`, "error"); item.quantity = product.stock; }
      }
      writeCart(cart);
      render();
    });
    render();
  }

  function currentOrderRows(cart, db) {
    return cart.map((item) => ({ item, product: db.products.find((product) => product.id === item.id) })).filter((row) => row.product);
  }

  function initCheckout() {
    const button = document.getElementById("confirmar-pedido");
    if (!button) return;
    if (!currentUser || currentUser.role !== "customer") {
      location.replace(`Index.html?next=${encodeURIComponent("checkoutpagamento.html")}`);
      return;
    }
    const cart = readCart();
    const rows = currentOrderRows(cart, loadDb());
    const list = document.getElementById("resumo-checkout");
    if (!rows.length) {
      list.textContent = "Seu carrinho está vazio. Volte à loja para escolher produtos.";
      button.disabled = true;
      return;
    }
    list.innerHTML = rows.map(({ item, product }) => `<li>${escapeHtml(product.name)} · ${item.quantity} × ${formatMoney(product.priceCents)} = ${formatMoney(item.quantity * product.priceCents)}</li>`).join("");
    document.getElementById("total-checkout").textContent = formatMoney(rows.reduce((sum, row) => sum + row.item.quantity * row.product.priceCents, 0));
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "Registrando pedido…";
      try {
        const create = () => {
          const db = loadDb();
          const signature = JSON.stringify(readCart().slice().sort((a, b) => a.id.localeCompare(b.id)));
          let pending;
          try { pending = JSON.parse(localStorage.getItem("technovaPendingOrder") || "null"); } catch (_) { pending = null; }
          if (!pending || pending.signature !== signature) {
            pending = { key: crypto.randomUUID(), signature };
            localStorage.setItem("technovaPendingOrder", JSON.stringify(pending));
          }
          const key = pending.key;
          const previous = db.orders.find((order) => order.userId === currentUser.id && order.idempotencyKey === key);
          if (previous) return previous;
          const requested = currentOrderRows(readCart(), db);
          if (!requested.length || requested.some(({ item, product }) => item.quantity > product.stock)) {
            throw new Error("O estoque mudou ou um item não está mais disponível. Atualize seu carrinho.");
          }
          const items = requested.map(({ item, product }) => ({
            productId: product.id, name: product.name, image: product.image,
            quantity: item.quantity, unitPriceCents: product.priceCents,
            subtotalCents: item.quantity * product.priceCents,
          }));
          const order = {
            id: `TN-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
            userId: currentUser.id, createdAt: new Date().toISOString(),
            totalCents: items.reduce((sum, item) => sum + item.subtotalCents, 0),
            status: "Pendente", pickupMethod: "Retirada no estabelecimento",
            paymentMethod: "Pagamento presencial na retirada", idempotencyKey: key, items,
          };
          requested.forEach(({ item, product }) => { product.stock -= item.quantity; });
          db.orders.push(order);
          saveDb(db);
          return order;
        };
        const order = navigator.locks?.request
          ? await navigator.locks.request("technova-checkout", create)
          : create();
        localStorage.removeItem(CART_KEY);
        localStorage.removeItem("technovaPendingOrder");
        location.href = `pedido-confirmado.html?pedido=${encodeURIComponent(order.id)}`;
      } catch (error) {
        message(error.message, "error");
        button.disabled = false;
        button.textContent = "Finalizar pedido";
      }
    });
  }

  function initProfile() {
    const target = document.getElementById("lista-pedidos");
    if (!target) return;
    if (currentUser?.role === "admin") { location.replace("admin.html"); return; }
    if (!currentUser || currentUser.role !== "customer") { location.replace("Index.html?next=profile.html"); return; }
    document.getElementById("cliente-nome").textContent = currentUser.name;
    document.getElementById("cliente-email").textContent = currentUser.email;
    const orders = loadDb().orders.filter((order) => order.userId === currentUser.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    target.innerHTML = orders.length ? orders.map((order) => `
      <article>
        <h3>Pedido ${escapeHtml(order.id)}</h3>
        <p>Data: ${new Date(order.createdAt).toLocaleString("pt-BR")}</p>
        <p>Status: <strong>${escapeHtml(order.status)}</strong></p>
        ${order.status === "Cancelado" ? "<p>Este pedido foi cancelado.</p>" : `<ol aria-label="Acompanhamento do pedido">${STATUS.slice(0, 5).map((status) => `<li ${STATUS.indexOf(status) === STATUS.indexOf(order.status) ? 'aria-current="step"' : ""}>${escapeHtml(status)}${STATUS.indexOf(status) === STATUS.indexOf(order.status) ? " (atual)" : ""}</li>`).join("")}</ol>`}
        <p>Total: ${formatMoney(order.totalCents)}</p>
        <ul>${order.items.map((item) => `<li>${escapeHtml(item.name)} · ${item.quantity} × ${formatMoney(item.unitPriceCents)}</li>`).join("")}</ul>
        <p>${escapeHtml(order.pickupMethod)} · ${escapeHtml(order.paymentMethod)}</p>
      </article>`).join("") : "<p>Você ainda não fez pedidos.</p>";
  }

  function initOrderConfirmation() {
    const target = document.getElementById("confirmacao-pedido");
    if (!target) return;
    const id = new URLSearchParams(location.search).get("pedido");
    const order = loadDb().orders.find((entry) => entry.id === id && entry.userId === currentUser?.id);
    if (!order) { target.textContent = "Não encontramos esse pedido na sua conta."; return; }
    target.innerHTML = `<h1>Pedido registrado</h1><p>Número do pedido: <strong>${escapeHtml(order.id)}</strong></p><p>Status: ${escapeHtml(order.status)}</p><p>Total: ${formatMoney(order.totalCents)}</p><ul>${order.items.map((item) => `<li>${escapeHtml(item.name)} · ${item.quantity} unidade(s)</li>`).join("")}</ul><p>Retire no estabelecimento e faça o pagamento presencialmente.</p>`;
  }

  function initAdmin() {
    const target = document.getElementById("lista-admin-pedidos");
    if (!target) return;
    const filter = document.getElementById("filtro-status-pedido");
    const load = () => {
      const db = loadDb();
      const orders = db.orders.filter((order) => !filter.value || order.status === filter.value).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      target.innerHTML = orders.length ? orders.map((order) => {
        const owner = db.users.find((user) => user.id === order.userId);
        return `<article>
          <h2>Pedido ${escapeHtml(order.id)}</h2>
          <p>Cliente: ${escapeHtml(owner?.name || "Conta removida")} · ${escapeHtml(owner?.email || "")}</p>
          <p>Data: ${new Date(order.createdAt).toLocaleString("pt-BR")}</p>
          <ul>${order.items.map((item) => `<li>${escapeHtml(item.name)} · ${item.quantity} × ${formatMoney(item.unitPriceCents)}</li>`).join("")}</ul>
          <p>Total: ${formatMoney(order.totalCents)} · ${escapeHtml(order.pickupMethod)} · ${escapeHtml(order.paymentMethod)}</p>
          <label>Status do pedido ${escapeHtml(order.id)}
            <select data-order-status="${escapeHtml(order.id)}">${STATUS.map((status) => `<option ${status === order.status ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}</select>
          </label>
          <button type="button" data-save-status="${escapeHtml(order.id)}">Salvar status</button>
        </article>`;
      }).join("") : "<p>Nenhum pedido encontrado.</p>";
    };
    filter.addEventListener("change", load);
    target.addEventListener("click", (event) => {
      const button = event.target.closest("[data-save-status]");
      if (!button) return;
      const id = button.dataset.saveStatus;
      const status = target.querySelector(`[data-order-status="${CSS.escape(id)}"]`).value;
      const db = loadDb();
      const order = db.orders.find((entry) => entry.id === id);
      if (!order) { message("Pedido não encontrado neste navegador.", "error"); return; }
      if (order.status !== "Cancelado" && status === "Cancelado") {
        order.items.forEach((item) => {
          const product = db.products.find((entry) => entry.id === item.productId);
          if (product) product.stock += item.quantity;
        });
      } else if (order.status === "Cancelado" && status !== "Cancelado") {
        for (const item of order.items) {
          const product = db.products.find((entry) => entry.id === item.productId);
          if (!product || product.stock < item.quantity) { message(`Estoque insuficiente para reativar o pedido (${item.name}).`, "error"); return; }
        }
        order.items.forEach((item) => { db.products.find((entry) => entry.id === item.productId).stock -= item.quantity; });
      }
      order.status = status;
      saveDb(db);
      message("Status do pedido atualizado.", "success");
      load();
    });
    load();
  }

  function initLogout() {
    document.querySelectorAll("[data-logout]").forEach((button) => button.addEventListener("click", () => {
      sessionStorage.removeItem(SESSION_KEY);
      location.href = "Index.html";
    }));
  }

  function init() {
    loadDb();
    currentUser = sessionUser();
    updateCartBadge();
    initAuth();
    initProducts();
    initCart();
    initCheckout();
    initProfile();
    initOrderConfirmation();
    initAdmin();
    initLogout();
  }

  document.addEventListener("technova:component-loaded", (event) => {
    if (event.detail?.id === "header") updateCartBadge();
  });
  window.addEventListener("storage", () => { updateCartBadge(); });
  document.addEventListener("DOMContentLoaded", init);
})();
