/**
 * Panneau admin — La Rosa Fleuriste Tlemcen
 */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const DA = (n) => `${Number(n || 0).toLocaleString('fr-FR')} DA`;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const toast = (msg) => {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2800);
  };

  const api = async (url, opts = {}) => {
    const res = await fetch(url, {
      headers: opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
      ...opts,
      body: opts.body instanceof FormData ? opts.body : opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (res.status === 401) { showLogin(); throw new Error('Session expirée, reconnectez-vous.'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    return data;
  };

  const STATUSES = ['nouvelle', 'confirmée', 'en préparation', 'livrée', 'annulée'];
  const statusBadge = (s) => `<span class="status status-${esc(s).replace(/ /g, '.')}">${esc(s)}</span>`;
  const fmtDate = (iso) => new Date(iso.replace(' ', 'T') + 'Z').toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  // ================= AUTH =================
  const showLogin = () => { $('#loginScreen').hidden = false; $('#app').hidden = true; };
  const showApp = () => { $('#loginScreen').hidden = true; $('#app').hidden = false; boot(); };

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#loginError').textContent = '';
    try {
      await api('/admin/api/login', { method: 'POST', body: { password: $('#loginPassword').value } });
      $('#loginPassword').value = '';
      showApp();
    } catch (err) {
      $('#loginError').textContent = err.message;
    }
  });

  $('#logoutBtn').addEventListener('click', async () => {
    await api('/admin/api/logout', { method: 'POST' }).catch(() => {});
    showLogin();
  });

  // ================= NAVIGATION =================
  const switchView = (view) => {
    $$('.side-link').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
    $$('.view').forEach((v) => (v.hidden = v.id !== `view-${view}`));
    ({ dashboard: loadDashboard, orders: loadOrders, products: loadProducts, categories: loadCategories, events: loadEvents, delivery: loadZones, settings: loadSettings })[view]?.();
  };
  $$('.side-link').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.view)));
  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-goto]');
    if (go) switchView(go.dataset.goto);
  });

  // ================= DASHBOARD =================
  async function loadDashboard() {
    $('#todayLabel').textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const s = await api('/admin/api/stats');
    $('#stOrdersToday').textContent = s.orders_today;
    $('#stOrdersNew').textContent = s.orders_new;
    $('#stRevenue').textContent = DA(s.revenue_month);
    $('#stProducts').textContent = s.products_count;
    $('#pillOrders').textContent = s.orders_new;
    $('#recentTable tbody').innerHTML = s.recent_orders.map((o) => `
      <tr>
        <td><b>${esc(o.order_number)}</b></td>
        <td>${esc(o.customer_name)}</td>
        <td>${esc(o.phone)}</td>
        <td><b>${DA(o.total)}</b></td>
        <td>${statusBadge(o.status)}</td>
        <td>${fmtDate(o.created_at)}</td>
      </tr>`).join('') || '<tr><td colspan="6">Aucune commande pour le moment 🌱</td></tr>';
  }

  // ================= COMMANDES =================
  let currentStatusFilter = '';
  let ORDERS = [];

  async function loadOrders() {
    $('#statusFilters').innerHTML =
      `<button class="sf-chip ${!currentStatusFilter ? 'active' : ''}" data-st="">Toutes</button>` +
      STATUSES.map((s) => `<button class="sf-chip ${currentStatusFilter === s ? 'active' : ''}" data-st="${s}">${s}</button>`).join('');
    $$('#statusFilters .sf-chip').forEach((c) =>
      c.addEventListener('click', () => { currentStatusFilter = c.dataset.st; loadOrders(); })
    );
    ORDERS = await api(`/admin/api/orders${currentStatusFilter ? `?status=${encodeURIComponent(currentStatusFilter)}` : ''}`);
    $('#ordersList').innerHTML = ORDERS.map((o) => `
      <div class="order-card" data-id="${o.id}">
        <div class="oc-num">${esc(o.order_number)}</div>
        <div class="oc-mid">
          <span>👤 ${esc(o.customer_name)} — 📞 ${esc(o.phone)}</span>
          <small>🛍 ${o.items.reduce((n, i) => n + i.qty, 0)} article(s) · 📍 ${esc(o.zone_name || '—')} · 🕐 ${fmtDate(o.created_at)}</small>
        </div>
        <div class="oc-right">
          <span class="oc-total">${DA(o.total)}</span>
          ${statusBadge(o.status)}
        </div>
      </div>`).join('') || '<div class="panel">Aucune commande 🌱</div>';

    $$('.order-card').forEach((c) => c.addEventListener('click', () => openOrder(+c.dataset.id)));
  }

  function openOrder(id) {
    const o = ORDERS.find((x) => x.id === id);
    if (!o) return;
    $('#odTitle').textContent = `${o.order_number}`;
    $('#odBody').innerHTML = `
      <div class="od-grid">
        <div class="od-field"><small>Client</small><strong>${esc(o.customer_name)}</strong></div>
        <div class="od-field"><small>Téléphone</small><strong><a href="tel:${esc(o.phone)}">${esc(o.phone)}</a></strong></div>
        <div class="od-field"><small>Zone</small><strong>${esc(o.zone_name || '—')}</strong></div>
        <div class="od-field"><small>Adresse</small><strong>${esc(o.address || '—')}</strong></div>
        <div class="od-field"><small>Date souhaitée</small><strong>${esc(o.delivery_date || '—')}</strong></div>
        <div class="od-field"><small>Reçue le</small><strong>${fmtDate(o.created_at)}</strong></div>
      </div>
      ${o.message ? `<div class="od-field"><small>💌 Message carte</small><strong>${esc(o.message)}</strong></div>` : ''}
      <div class="od-items">
        ${o.items.map((i) => `<div><span>${i.qty} × ${esc(i.name)}${i.size ? ` (${esc(i.size)})` : ''}${i.color ? ` · ${esc(i.color)}` : ''}</span><b>${DA(i.unit_price * i.qty)}</b></div>`).join('')}
        <div><span>Livraison</span><b>${DA(o.delivery_fee)}</b></div>
        <div><span><b>TOTAL</b></span><b>${DA(o.total)}</b></div>
      </div>
      <div class="od-actions">
        <label><b>Statut :</b></label>
        <select id="odStatus">${STATUSES.map((s) => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
        <a class="btn btn-ghost" href="https://wa.me/${esc(String(o.phone).replace(/[^0-9]/g, ''))}" target="_blank">💬 WhatsApp client</a>
        <button class="btn btn-danger" id="odDelete">🗑 Supprimer</button>
      </div>`;
    $('#odStatus').addEventListener('change', async (e) => {
      try {
        await api(`/admin/api/orders/${o.id}`, { method: 'PUT', body: { status: e.target.value } });
        toast('✅ Statut mis à jour');
        loadOrders(); loadDashboard();
      } catch (err) { toast(`⚠️ ${err.message}`); }
    });
    $('#odDelete').addEventListener('click', async () => {
      if (!confirm(`Supprimer définitivement la commande ${o.order_number} ?`)) return;
      await api(`/admin/api/orders/${o.id}`, { method: 'DELETE' });
      toast('🗑 Commande supprimée');
      closeModals(); loadOrders();
    });
    $('#orderModal').hidden = false;
  }

  // ================= PRODUITS =================
  let PRODUCTS = [];
  let editing = null; // produit en cours d'édition (null = nouveau)
  let editorImages = [];

  async function loadProducts() {
    PRODUCTS = await api('/admin/api/products');
    $('#adminProducts').innerHTML = PRODUCTS.map((p) => `
      <div class="ap-card ${p.active ? '' : 'inactive'}" data-id="${p.id}">
        <div class="ap-flags">
          ${p.best_seller ? '<span>⭐ Best</span>' : ''}
          ${p.active ? '' : '<span>🙈 Masqué</span>'}
        </div>
        <img src="${esc(p.images[0] || '/img/products/p01.svg')}" alt="">
        <div class="ap-body">
          <h4>${esc(p.name)}</h4>
          <div class="meta"><span>${esc(p.category)}</span><b>${DA(p.price)}</b></div>
        </div>
      </div>`).join('');
    $$('.ap-card').forEach((c) => c.addEventListener('click', () => openEditor(+c.dataset.id)));
  }

  const sizeRow = (s = { label: '', price: '' }) => {
    const div = document.createElement('div');
    div.className = 'opt-row';
    div.innerHTML = `
      <input placeholder="Taille (ex: M — Moyen)" class="sz-label" value="${esc(s.label)}">
      <input type="number" placeholder="Prix DA" class="sz-price" min="0" value="${esc(s.price)}">
      <button type="button" class="del">✕</button>`;
    div.querySelector('.del').addEventListener('click', () => div.remove());
    return div;
  };

  const colorRow = (c = { name: '', hex: '#e0355c' }) => {
    const div = document.createElement('div');
    div.className = 'opt-row';
    div.innerHTML = `
      <input type="color" class="cl-hex" value="${esc(c.hex || '#e0355c')}">
      <input placeholder="Nom (ex: Rouge passion)" class="cl-name" value="${esc(c.name)}">
      <button type="button" class="del">✕</button>`;
    div.querySelector('.del').addEventListener('click', () => div.remove());
    return div;
  };

  const renderEditorImages = () => {
    $('#imgList').innerHTML = editorImages.map((src, i) => `
      <div class="img-item"><img src="${esc(src)}"><button type="button" data-i="${i}">✕</button></div>`).join('');
    $$('#imgList button').forEach((b) =>
      b.addEventListener('click', () => { editorImages.splice(+b.dataset.i, 1); renderEditorImages(); })
    );
  };

  async function openEditor(id = null) {
    editing = id ? PRODUCTS.find((p) => p.id === id) : null;
    const f = $('#editorForm');
    f.reset();
    $('#editorTitle').textContent = editing ? `Modifier — ${editing.name}` : 'Nouveau produit';
    $('#deleteProductBtn').hidden = !editing;

    // Liste des catégories (gérées dans l'onglet Catégories)
    if (!CATEGORIES.length) CATEGORIES = await api('/admin/api/categories').catch(() => []);
    const names = CATEGORIES.map((c) => c.name);
    if (editing?.category && !names.includes(editing.category)) names.push(editing.category);
    $('#editorCategory').innerHTML = names
      .map((n) => `<option ${n === (editing?.category || 'Bouquets') ? 'selected' : ''}>${esc(n)}</option>`)
      .join('');

    f.name.value = editing?.name || '';
    f.rating.value = editing?.rating ?? 4.8;
    f.rating_count.value = editing?.rating_count ?? 0;
    f.description.value = editing?.description || '';
    f.special.value = editing?.special || '';
    f.price.value = editing?.price ?? '';
    f.sort_order.value = editing?.sort_order ?? 0;
    f.best_seller.checked = !!editing?.best_seller;
    f.active.checked = editing ? !!editing.active : true;

    editorImages = [...(editing?.images || [])];
    renderEditorImages();

    $('#sizeRows').innerHTML = '';
    (editing?.sizes || []).forEach((s) => $('#sizeRows').appendChild(sizeRow(s)));
    $('#colorRows').innerHTML = '';
    (editing?.colors || []).forEach((c) => $('#colorRows').appendChild(colorRow(c)));

    $('#productEditor').hidden = false;
  }

  $('#newProductBtn').addEventListener('click', () => openEditor(null));
  $('#addSizeBtn').addEventListener('click', () => $('#sizeRows').appendChild(sizeRow()));
  $('#addColorBtn').addEventListener('click', () => $('#colorRows').appendChild(colorRow()));

  $('#imgInput').addEventListener('change', async (e) => {
    if (!e.target.files.length) return;
    const fd = new FormData();
    [...e.target.files].forEach((f) => fd.append('images', f));
    try {
      toast('⏳ Téléversement des images…');
      const { files } = await api('/admin/api/upload', { method: 'POST', body: fd });
      editorImages.push(...files);
      renderEditorImages();
      toast('📷 Images ajoutées !');
    } catch (err) { toast(`⚠️ ${err.message}`); }
    e.target.value = '';
  });

  $('#editorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const body = {
      name: f.name.value.trim(),
      category: f.category.value.trim() || 'Bouquets',
      description: f.description.value.trim(),
      special: f.special.value.trim(),
      price: +f.price.value || 0,
      sort_order: +f.sort_order.value || 0,
      rating: +f.rating.value || 0,
      rating_count: +f.rating_count.value || 0,
      best_seller: f.best_seller.checked,
      active: f.active.checked,
      images: editorImages,
      sizes: $$('#sizeRows .opt-row')
        .map((r) => ({ label: r.querySelector('.sz-label').value.trim(), price: +r.querySelector('.sz-price').value || 0 }))
        .filter((s) => s.label),
      colors: $$('#colorRows .opt-row')
        .map((r) => ({ name: r.querySelector('.cl-name').value.trim(), hex: r.querySelector('.cl-hex').value }))
        .filter((c) => c.name),
    };
    try {
      if (editing) await api(`/admin/api/products/${editing.id}`, { method: 'PUT', body });
      else await api('/admin/api/products', { method: 'POST', body });
      toast(`✅ Produit ${editing ? 'modifié' : 'créé'} !`);
      closeModals(); loadProducts();
    } catch (err) { toast(`⚠️ ${err.message}`); }
  });

  $('#deleteProductBtn').addEventListener('click', async () => {
    if (!editing || !confirm(`Supprimer « ${editing.name} » définitivement ?`)) return;
    await api(`/admin/api/products/${editing.id}`, { method: 'DELETE' });
    toast('🗑 Produit supprimé');
    closeModals(); loadProducts();
  });

  // ================= CATÉGORIES =================
  let CATEGORIES = [];

  const uploadOne = async (file) => {
    const fd = new FormData();
    fd.append('images', file);
    const { files } = await api('/admin/api/upload', { method: 'POST', body: fd });
    return files[0];
  };

  async function loadCategories() {
    CATEGORIES = await api('/admin/api/categories');
    $('#catList').innerHTML = CATEGORIES.map((c) => `
      <div class="cat-row" data-id="${c.id}">
        <label class="cat-icon" title="Changer l'icône">
          ${c.icon ? `<img src="${esc(c.icon)}" alt="">` : `<span>${esc(c.emoji || '💐')}</span>`}
          <input type="file" class="c-icon-input" accept="image/*" hidden>
        </label>
        <input class="c-name" value="${esc(c.name)}" maxlength="60">
        <input class="c-emoji" value="${esc(c.emoji || '')}" maxlength="4" title="Emoji">
        <input class="c-sort" type="number" value="${c.sort_order}" title="Ordre" style="max-width:74px">
        <label class="check c-active-w" title="Visible"><input type="checkbox" class="c-active" ${c.active ? 'checked' : ''}>👁</label>
        <span class="c-count">${c.product_count} produit${c.product_count > 1 ? 's' : ''}</span>
        <button class="btn-sm c-save">💾 Enregistrer</button>
        <button class="btn-sm c-del" style="background:#fee2e2;color:#b91c1c">🗑</button>
      </div>`).join('');

    $$('#catList .cat-row').forEach((row) => {
      const id = +row.dataset.id;
      const cat = CATEGORIES.find((c) => c.id === id);

      row.querySelector('.c-icon-input').addEventListener('change', async (e) => {
        if (!e.target.files.length) return;
        try {
          toast('⏳ Téléversement…');
          const icon = await uploadOne(e.target.files[0]);
          await api(`/admin/api/categories/${id}`, { method: 'PUT', body: { ...cat, icon } });
          toast('🖼 Icône mise à jour !');
          loadCategories();
        } catch (err) { toast(`⚠️ ${err.message}`); }
      });

      row.querySelector('.c-save').addEventListener('click', async () => {
        try {
          await api(`/admin/api/categories/${id}`, {
            method: 'PUT',
            body: {
              name: row.querySelector('.c-name').value.trim(),
              emoji: row.querySelector('.c-emoji').value.trim(),
              icon: cat.icon,
              sort_order: +row.querySelector('.c-sort').value || 0,
              active: row.querySelector('.c-active').checked ? 1 : 0,
            },
          });
          toast('✅ Catégorie mise à jour');
          loadCategories();
        } catch (err) { toast(`⚠️ ${err.message}`); }
      });

      row.querySelector('.c-del').addEventListener('click', async () => {
        const n = cat.product_count;
        if (!confirm(`Supprimer « ${cat.name} » ?${n ? `\n${n} produit(s) seront déplacés vers « Autres ».` : ''}`)) return;
        await api(`/admin/api/categories/${id}`, { method: 'DELETE' });
        toast('🗑 Catégorie supprimée');
        loadCategories();
      });
    });
  }

  $('#newCatBtn').addEventListener('click', async () => {
    const name = prompt('Nom de la nouvelle catégorie :');
    if (!name) return;
    const emoji = prompt('Un emoji pour cette catégorie (ex: 🎁) :', '💐') || '💐';
    try {
      await api('/admin/api/categories', { method: 'POST', body: { name, emoji, sort_order: CATEGORIES.length + 1 } });
      toast('✅ Catégorie créée — cliquez sur son icône pour ajouter une image');
      loadCategories();
    } catch (err) { toast(`⚠️ ${err.message}`); }
  });

  // ================= ÉVÉNEMENTS =================
  async function loadEvents() {
    const events = await api('/admin/api/events');
    $('#eventList').innerHTML = events.map((ev) => `
      <div class="event-card ${ev.active ? 'on' : ''}" data-id="${ev.id}" style="--e1:${esc(ev.color1)};--e2:${esc(ev.color2)}">
        <div class="ev-head">
          <span class="ev-emoji">${esc(ev.emoji)}</span>
          <strong>${esc(ev.name)}</strong>
          <label class="switch" title="${ev.active ? 'Désactiver' : 'Activer'}">
            <input type="checkbox" class="ev-toggle" ${ev.active ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
        <label class="ev-field">Message de la bannière
          <input class="ev-banner" value="${esc(ev.banner)}" maxlength="300">
        </label>
        <div class="ev-colors">
          <label>Couleur 1 <input type="color" class="ev-c1" value="${esc(ev.color1)}"></label>
          <label>Couleur 2 <input type="color" class="ev-c2" value="${esc(ev.color2)}"></label>
          <label>Emojis flottants <input class="ev-particles" value="${esc(ev.particles)}" maxlength="12" style="max-width:110px"></label>
          <button class="btn-sm ev-save">💾 Enregistrer</button>
        </div>
      </div>`).join('');

    $$('#eventList .event-card').forEach((card) => {
      const id = +card.dataset.id;
      const save = async (extra = {}) => {
        try {
          await api(`/admin/api/events/${id}`, {
            method: 'PUT',
            body: {
              banner: card.querySelector('.ev-banner').value,
              color1: card.querySelector('.ev-c1').value,
              color2: card.querySelector('.ev-c2').value,
              particles: card.querySelector('.ev-particles').value,
              active: card.querySelector('.ev-toggle').checked,
              ...extra,
            },
          });
        } catch (err) { toast(`⚠️ ${err.message}`); }
      };
      card.querySelector('.ev-toggle').addEventListener('change', async (e) => {
        await save({ active: e.target.checked });
        toast(e.target.checked ? '🎉 Événement activé sur la boutique !' : 'Événement désactivé');
        loadEvents();
      });
      card.querySelector('.ev-save').addEventListener('click', async () => {
        await save();
        toast('💾 Événement enregistré');
        loadEvents();
      });
    });
  }

  // ================= LIVRAISON =================
  async function loadZones() {
    const zones = await api('/admin/api/zones');
    $('#zonesTable tbody').innerHTML = zones.map((z) => `
      <tr data-id="${z.id}">
        <td><input class="z-name" value="${esc(z.name)}"></td>
        <td><input class="z-fee" type="number" min="0" value="${z.fee}" style="max-width:110px"></td>
        <td><input class="z-delay" value="${esc(z.delay || '')}"></td>
        <td><input class="z-active" type="checkbox" ${z.active ? 'checked' : ''} style="width:20px;height:20px"></td>
        <td style="white-space:nowrap">
          <button class="btn-sm z-save">💾</button>
          <button class="btn-sm z-del" style="background:#fee2e2;color:#b91c1c">🗑</button>
        </td>
      </tr>`).join('');

    $$('#zonesTable .z-save').forEach((b) =>
      b.addEventListener('click', async () => {
        const tr = b.closest('tr');
        try {
          await api(`/admin/api/zones/${tr.dataset.id}`, {
            method: 'PUT',
            body: {
              name: tr.querySelector('.z-name').value,
              fee: +tr.querySelector('.z-fee').value,
              delay: tr.querySelector('.z-delay').value,
              active: tr.querySelector('.z-active').checked ? 1 : 0,
            },
          });
          toast('✅ Zone mise à jour');
        } catch (err) { toast(`⚠️ ${err.message}`); }
      })
    );
    $$('#zonesTable .z-del').forEach((b) =>
      b.addEventListener('click', async () => {
        const tr = b.closest('tr');
        if (!confirm('Supprimer cette zone ?')) return;
        await api(`/admin/api/zones/${tr.dataset.id}`, { method: 'DELETE' });
        loadZones();
      })
    );
  }

  $('#newZoneBtn').addEventListener('click', async () => {
    const name = prompt('Nom de la zone (ex: Sidi Saïd) :');
    if (!name) return;
    const fee = +prompt('Tarif de livraison (DA) :', '400') || 0;
    await api('/admin/api/zones', { method: 'POST', body: { name, fee, delay: 'Livraison le jour même' } });
    toast('✅ Zone ajoutée');
    loadZones();
  });

  // ================= PARAMÈTRES =================
  async function loadSettings() {
    const s = await api('/admin/api/settings');
    const f = $('#settingsForm');
    for (const [k, v] of Object.entries(s)) {
      const el = f.elements[k];
      if (!el) continue;
      if (el.type === 'checkbox') el.checked = v === '1';
      else el.value = v;
    }
    $('#heroPreview').src = s.hero_image || '/img/hero-bouquet.svg';
    $('#logoPreview').src = s.logo_image || '/img/logo.svg';
  }

  // Upload image hero / logo (appliqué immédiatement)
  const bindImageSetting = (inputId, previewId, key, label) => {
    $(inputId).addEventListener('change', async (e) => {
      if (!e.target.files.length) return;
      try {
        toast('⏳ Téléversement…');
        const url = await uploadOne(e.target.files[0]);
        await api('/admin/api/settings', { method: 'PUT', body: { [key]: url } });
        $(previewId).src = url;
        toast(`✅ ${label} mis à jour !`);
      } catch (err) { toast(`⚠️ ${err.message}`); }
      e.target.value = '';
    });
  };
  bindImageSetting('#heroImageInput', '#heroPreview', 'hero_image', 'Image du hero');
  bindImageSetting('#logoImageInput', '#logoPreview', 'logo_image', 'Logo');

  $('#settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const body = {};
    [...f.elements].forEach((el) => {
      if (!el.name) return;
      body[el.name] = el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value.trim();
    });
    try {
      await api('/admin/api/settings', { method: 'PUT', body });
      toast('💾 Paramètres enregistrés !');
    } catch (err) { toast(`⚠️ ${err.message}`); }
  });

  $('#testNotifBtn').addEventListener('click', async () => {
    const btn = $('#testNotifBtn');
    btn.disabled = true;
    try {
      const { report } = await api('/admin/api/test-notification', { method: 'POST' });
      const parts = Object.entries(report).map(([k, v]) => `${k}: ${v}`);
      toast(`📨 Test envoyé — ${parts.join(' · ') || 'aucun canal configuré'}`);
    } catch (err) { toast(`⚠️ ${err.message}`); }
    btn.disabled = false;
  });

  $('#passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/admin/api/password', { method: 'POST', body: { new_password: $('#newPassword').value } });
      $('#newPassword').value = '';
      toast('🔒 Mot de passe changé !');
    } catch (err) { toast(`⚠️ ${err.message}`); }
  });

  // ================= MODALES =================
  const closeModals = () => { $('#productEditor').hidden = true; $('#orderModal').hidden = true; };
  $$('[data-close]').forEach((b) => b.addEventListener('click', closeModals));
  $$('.modal-overlay').forEach((ov) => ov.addEventListener('click', (e) => e.target === ov && closeModals()));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeModals());

  // ================= BOOT =================
  async function boot() {
    await loadDashboard().catch((e) => toast(`⚠️ ${e.message}`));
  }

  // Session déjà active ?
  api('/admin/api/me').then(showApp).catch(showLogin);
})();
