/**
 * La Rosa Fleuriste Tlemcen — boutique (front public) v2
 * Hero médaillon rotatif, catégories dynamiques, notes, événements spéciaux.
 */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const DA = (n) => `${Number(n || 0).toLocaleString('fr-FR')} DA`;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let SETTINGS = {};
  let PRODUCTS = [];
  let ZONES = [];
  let CATEGORIES = [];
  let EVENTS = [];
  let STATIC_MODE = false; // true = pas de backend : commande via WhatsApp
  let cart = JSON.parse(localStorage.getItem('larosa_cart') || '[]');

  // ---------- Helpers ----------
  const toast = (msg) => {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2600);
  };

  const waLink = (text = '') => {
    const num = (SETTINGS.whatsapp || '').replace(/[^0-9]/g, '');
    return num ? `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ''}` : '#';
  };

  const starsHTML = (rating, count) => {
    const r = Math.max(0, Math.min(5, +rating || 0));
    if (!r) return '';
    const pct = (r / 5) * 100;
    return `<span class="stars" title="${r}/5">
      <span class="stars-bg">★★★★★</span><span class="stars-fill" style="width:${pct}%">★★★★★</span>
    </span><small class="stars-meta">${r.toFixed(1)}${count ? ` (${count})` : ''}</small>`;
  };

  // ---------- Le bouquet roule avec le scroll ----------
  const medallion = $('#medallion');
  const ringText = $('#ringText');
  let targetRot = 0, currentRot = 0, rafActive = false;
  const animateSpin = () => {
    currentRot += (targetRot - currentRot) * 0.08;
    if (medallion) medallion.style.transform = `rotate(${currentRot.toFixed(2)}deg)`;
    if (ringText) ringText.style.transform = `rotate(${(-currentRot * 0.6).toFixed(2)}deg)`;
    if (Math.abs(targetRot - currentRot) > 0.05) requestAnimationFrame(animateSpin);
    else rafActive = false;
  };
  window.addEventListener('scroll', () => {
    targetRot = window.scrollY * 0.25; // ça roule 🌹
    $('#nav').classList.toggle('scrolled', window.scrollY > 30);
    if (!rafActive) { rafActive = true; requestAnimationFrame(animateSpin); }
  }, { passive: true });

  // Pétales + poussière d'or dans le hero
  const spawnFloaters = (box, glyphs, n, cls) => {
    if (!box) return;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = cls;
      p.textContent = glyphs[i % glyphs.length];
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDuration = `${9 + Math.random() * 14}s`;
      p.style.animationDelay = `${-Math.random() * 20}s`;
      p.style.fontSize = `${12 + Math.random() * 20}px`;
      box.appendChild(p);
    }
  };
  spawnFloaters($('#petals'), ['🌸', '🌹', '💮', '🌷', '✿', '❀'], 12, 'petal');
  spawnFloaters($('#goldDust'), ['✦', '✧', '✨', '·'], 16, 'dust');

  // Apparition au scroll + compteurs animés
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('visible')),
    { threshold: 0.12 }
  );
  const observeReveals = () => $$('.reveal:not(.visible)').forEach((el) => io.observe(el));

  const countUp = (el) => {
    const end = +el.dataset.count, suffix = el.dataset.suffix || '';
    const dur = 1400, t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  $$('.hero-stats strong[data-count]').forEach(countUp);

  // ---------- Événements spéciaux ----------
  const applyEvent = () => {
    const ev = EVENTS[0];
    if (!ev) return;
    document.documentElement.style.setProperty('--ev1', ev.color1);
    document.documentElement.style.setProperty('--ev2', ev.color2);
    document.body.classList.add('has-event');
    const banner = $('#eventBanner');
    const msg = `${ev.emoji} ${ev.banner || ev.name} ${ev.emoji}`;
    $('#eventBannerTrack').innerHTML = Array(6).fill(`<span>${esc(msg)}</span>`).join('');
    banner.hidden = false;
    // Particules thématiques flottantes
    const glyphs = [...(ev.particles || '✨')].filter((c) => c.trim());
    const boxP = $('#eventParticles');
    for (let i = 0; i < 16; i++) {
      const p = document.createElement('span');
      p.textContent = glyphs[i % glyphs.length] || '✨';
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDuration = `${10 + Math.random() * 16}s`;
      p.style.animationDelay = `${-Math.random() * 20}s`;
      p.style.fontSize = `${14 + Math.random() * 18}px`;
      boxP.appendChild(p);
    }
  };

  // ---------- Rendu catégories ----------
  const catByName = (name) => CATEGORIES.find((c) => c.name === name);

  const renderCatRail = () => {
    $('#catRail').innerHTML = CATEGORIES.map((c) => `
      <button class="cat-card" data-cat="${esc(c.name)}">
        <span class="cat-ico">${c.icon ? `<img src="${esc(c.icon)}" alt="" loading="lazy">` : `<i>${esc(c.emoji || '💐')}</i>`}</span>
        <strong>${esc(c.name)}</strong>
      </button>`).join('');
    $$('.cat-card').forEach((b) =>
      b.addEventListener('click', () => {
        selectFilter(b.dataset.cat);
        document.getElementById('boutique').scrollIntoView({ behavior: 'smooth' });
      })
    );
  };

  // ---------- Rendu produits (catalogue condensé) ----------
  const cardHTML = (p) => `
    <article class="card reveal" data-id="${p.id}">
      ${p.best_seller ? '<span class="badge-bs">⭐ Best</span>' : ''}
      <div class="card-img"><img src="${esc(p.images[0] || '/img/products/p01.svg')}" alt="${esc(p.name)}" loading="lazy"></div>
      <div class="card-body">
        <span class="card-cat">${esc(catByName(p.category)?.emoji || '')} ${esc(p.category)}</span>
        <h3>${esc(p.name)}</h3>
        <div class="card-rating">${starsHTML(p.rating, p.rating_count)}</div>
        <div class="card-foot">
          <span class="price">${DA(p.sizes?.length ? Math.min(...p.sizes.map((s) => s.price)) : p.price)}</span>
          <button class="btn-mini" aria-label="Voir">＋</button>
        </div>
      </div>
    </article>`;

  let activeFilter = 'Tout';
  const renderProducts = () => {
    const list = activeFilter === 'Tout' ? PRODUCTS : PRODUCTS.filter((p) => p.category === activeFilter);
    $('#productGrid').innerHTML = list.map(cardHTML).join('') || '<p class="empty">Aucun produit dans cette catégorie 🌱</p>';
    observeReveals();
  };

  const renderFilters = () => {
    const cats = ['Tout', ...CATEGORIES.filter((c) => PRODUCTS.some((p) => p.category === c.name)).map((c) => c.name)];
    $('#filters').innerHTML = cats
      .map((c) => `<button class="filter-chip ${c === activeFilter ? 'active' : ''}" data-cat="${esc(c)}">${c === 'Tout' ? '✨ Tout' : `${esc(catByName(c)?.emoji || '')} ${esc(c)}`}</button>`)
      .join('');
    $$('.filter-chip').forEach((b) => b.addEventListener('click', () => selectFilter(b.dataset.cat)));
  };

  const selectFilter = (cat) => {
    activeFilter = CATEGORIES.some((c) => c.name === cat) || cat === 'Tout' ? cat : 'Tout';
    renderFilters();
    renderProducts();
  };

  const renderBestSellers = () => {
    $('#bestSellerGrid').innerHTML = PRODUCTS.filter((p) => p.best_seller).map(cardHTML).join('');
    observeReveals();
  };

  // ---------- Modale produit ----------
  const modal = $('#productModal');
  let current = null, selSize = null, selColor = null, qty = 1;

  const currentPrice = () => (selSize ? selSize.price : current.price) * qty;
  const refreshPrice = () => { $('#pmPrice').textContent = DA(currentPrice()); $('#pmQty').textContent = qty; };

  const openProduct = (id) => {
    current = PRODUCTS.find((p) => p.id === id);
    if (!current) return;
    qty = 1;
    selSize = current.sizes?.[0] || null;
    selColor = current.colors?.[0] || null;

    $('#pmCat').textContent = `${catByName(current.category)?.emoji || ''} ${current.category}`;
    $('#pmName').textContent = current.name;
    $('#pmRating').innerHTML = starsHTML(current.rating, current.rating_count);
    $('#pmDesc').textContent = current.description;
    $('#pmImg').src = current.images[0] || '';
    $('#pmImg').alt = current.name;

    $('#pmThumbs').innerHTML = (current.images || [])
      .map((src, i) => `<img src="${esc(src)}" class="${i === 0 ? 'active' : ''}" data-src="${esc(src)}" alt="">`)
      .join('');
    $$('#pmThumbs img').forEach((im) =>
      im.addEventListener('click', () => {
        $('#pmImg').src = im.dataset.src;
        $$('#pmThumbs img').forEach((x) => x.classList.remove('active'));
        im.classList.add('active');
      })
    );

    $('#pmSpecial').innerHTML = (current.special || '')
      .split('•').map((s) => s.trim()).filter(Boolean)
      .map((s) => `<span>✨ ${esc(s)}</span>`).join('');

    $('#pmSizesWrap').style.display = current.sizes?.length ? '' : 'none';
    $('#pmSizes').innerHTML = (current.sizes || [])
      .map((s, i) => `<button type="button" class="chip ${i === 0 ? 'active' : ''}" data-i="${i}">${esc(s.label)}<em>${DA(s.price)}</em></button>`)
      .join('');
    $$('#pmSizes .chip').forEach((c) =>
      c.addEventListener('click', () => {
        $$('#pmSizes .chip').forEach((x) => x.classList.remove('active'));
        c.classList.add('active');
        selSize = current.sizes[+c.dataset.i];
        refreshPrice();
      })
    );

    $('#pmColorsWrap').style.display = current.colors?.length ? '' : 'none';
    $('#pmColors').innerHTML = (current.colors || [])
      .map((c, i) => `<button type="button" class="chip color-chip ${i === 0 ? 'active' : ''}" data-i="${i}"><i style="background:${esc(c.hex)}"></i>${esc(c.name)}</button>`)
      .join('');
    $$('#pmColors .chip').forEach((c) =>
      c.addEventListener('click', () => {
        $$('#pmColors .chip').forEach((x) => x.classList.remove('active'));
        c.classList.add('active');
        selColor = current.colors[+c.dataset.i];
      })
    );

    refreshPrice();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  };

  $('#pmMinus').addEventListener('click', () => { qty = Math.max(1, qty - 1); refreshPrice(); });
  $('#pmPlus').addEventListener('click', () => { qty = Math.min(50, qty + 1); refreshPrice(); });

  $('#pmAdd').addEventListener('click', () => {
    const key = `${current.id}|${selSize?.label || ''}|${selColor?.name || ''}`;
    const found = cart.find((i) => i.key === key);
    if (found) found.qty += qty;
    else cart.push({
      key, product_id: current.id, name: current.name, image: current.images[0] || '',
      size: selSize?.label || '', color: selColor?.name || '',
      unit_price: selSize ? selSize.price : current.price, qty,
    });
    saveCart();
    closeOverlays();
    toast(`🌹 ${current.name} ajouté au panier !`);
  });

  // ---------- Panier ----------
  const drawer = $('#cartDrawer');
  const saveCart = () => {
    localStorage.setItem('larosa_cart', JSON.stringify(cart));
    $('#cartCount').textContent = cart.reduce((s, i) => s + i.qty, 0);
  };
  const subtotal = () => cart.reduce((s, i) => s + i.unit_price * i.qty, 0);

  const renderCart = () => {
    $('#cartItems').innerHTML = cart.length
      ? cart.map((it, idx) => `
        <div class="cart-item">
          <img src="${esc(it.image)}" alt="">
          <div class="ci-info">
            <strong>${esc(it.name)}</strong>
            <small>${[it.size, it.color].filter(Boolean).map(esc).join(' · ') || '&nbsp;'}</small>
            <div class="qty qty-sm">
              <button data-act="minus" data-i="${idx}">−</button><span>${it.qty}</span><button data-act="plus" data-i="${idx}">+</button>
            </div>
          </div>
          <div class="ci-right">
            <span>${DA(it.unit_price * it.qty)}</span>
            <button class="ci-del" data-act="del" data-i="${idx}">🗑</button>
          </div>
        </div>`).join('')
      : '<p class="empty">Votre panier est vide 🌷<br>Craquez pour un bouquet !</p>';
    $('#cartSubtotal').textContent = DA(subtotal());
    $('#toCheckout').disabled = !cart.length;
  };

  $('#cartItems').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const i = +btn.dataset.i;
    if (btn.dataset.act === 'del') cart.splice(i, 1);
    if (btn.dataset.act === 'minus') { cart[i].qty--; if (cart[i].qty < 1) cart.splice(i, 1); }
    if (btn.dataset.act === 'plus') cart[i].qty = Math.min(50, cart[i].qty + 1);
    saveCart(); renderCart();
  });

  const showStep = (id) => {
    ['cartStep', 'checkoutStep', 'successStep'].forEach((s) => ($('#' + s).hidden = s !== id));
  };

  const openCart = () => {
    renderCart();
    showStep('cartStep');
    drawer.hidden = false;
    document.body.style.overflow = 'hidden';
  };

  $('#cartBtn').addEventListener('click', openCart);

  $('#toCheckout').addEventListener('click', () => {
    $('#coZone').innerHTML = '<option value="">— Choisir une zone —</option>' +
      ZONES.map((z) => `<option value="${z.id}" data-fee="${z.fee}">${esc(z.name)} (+${DA(z.fee)}, ${esc(z.delay)})</option>`).join('');
    refreshCheckoutTotals();
    showStep('checkoutStep');
  });

  $('#backToCart').addEventListener('click', () => showStep('cartStep'));

  const refreshCheckoutTotals = () => {
    const fee = +($('#coZone').selectedOptions[0]?.dataset.fee || 0);
    $('#coSubtotal').textContent = DA(subtotal());
    $('#coDelivery').textContent = DA(fee);
    $('#coTotal').textContent = DA(subtotal() + fee);
  };
  $('#coZone').addEventListener('change', refreshCheckoutTotals);

  // Récapitulatif de commande envoyé au fleuriste sur WhatsApp (mode statique)
  const orderWhatsAppText = () => {
    const zone = ZONES.find((z) => z.id === +$('#coZone').value);
    const fee = zone ? zone.fee : 0;
    const lines = cart
      .map((it) => `• ${it.qty} × ${it.name}${[it.size, it.color].filter(Boolean).length ? ` (${[it.size, it.color].filter(Boolean).join(', ')})` : ''} — ${DA(it.unit_price * it.qty)}`)
      .join('\n');
    return [
      '🌹 Nouvelle commande — La Rosa Fleuriste',
      '',
      `👤 ${$('#coName').value.trim()}`,
      `📞 ${$('#coPhone').value.trim()}`,
      `📍 ${zone ? zone.name : '—'}${$('#coAddress').value.trim() ? ` — ${$('#coAddress').value.trim()}` : ''}`,
      $('#coDate').value ? `📅 ${$('#coDate').value}` : '',
      '',
      lines,
      '',
      `Sous-total : ${DA(subtotal())}`,
      `Livraison : ${DA(fee)}`,
      `💰 TOTAL : ${DA(subtotal() + fee)}`,
      $('#coMessage').value.trim() ? `\n💌 « ${$('#coMessage').value.trim()} »` : '',
    ].filter((l) => l !== '').join('\n');
  };

  $('#checkoutStep').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#coSubmit');

    if (STATIC_MODE) {
      window.open(waLink(orderWhatsAppText()), '_blank');
      $('#successNumber').textContent = 'envoyée sur WhatsApp';
      $('#successWa').href = waLink(orderWhatsAppText());
      cart = []; saveCart();
      showStep('successStep');
      return;
    }

    btn.disabled = true; btn.textContent = 'Envoi en cours… 🌸';
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: $('#coName').value.trim(),
          phone: $('#coPhone').value.trim(),
          zone_id: +$('#coZone').value || null,
          address: $('#coAddress').value.trim(),
          delivery_date: $('#coDate').value,
          message: $('#coMessage').value.trim(),
          items: cart.map(({ product_id, size, color, qty }) => ({ product_id, size, color, qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      $('#successNumber').textContent = data.order_number;
      $('#successWa').href = waLink(`Bonjour La Rosa 🌹 Je viens de passer la commande ${data.order_number} (total ${DA(data.total)}).`);
      cart = []; saveCart();
      showStep('successStep');
    } catch (err) {
      toast(`⚠️ ${err.message}`);
    } finally {
      btn.disabled = false; btn.textContent = '✅ Confirmer la commande';
    }
  });

  // ---------- Fermetures / navigation ----------
  const closeOverlays = () => {
    modal.hidden = true; drawer.hidden = true;
    document.body.style.overflow = '';
  };
  $$('[data-close]').forEach((b) => b.addEventListener('click', closeOverlays));
  [modal, drawer].forEach((ov) => ov.addEventListener('click', (e) => e.target === ov && closeOverlays()));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeOverlays());

  document.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (card) openProduct(+card.dataset.id);
  });

  $('#burger').addEventListener('click', () => $('#navLinks').classList.toggle('open'));
  $$('.nav-links a').forEach((a) => a.addEventListener('click', () => $('#navLinks').classList.remove('open')));

  // ---------- Chargement des données ----------
  const applySettings = () => {
    const wa = waLink('Bonjour La Rosa Fleuriste 🌹 Je souhaite commander.');
    ['navWhatsapp', 'heroWhatsapp', 'contactWhatsapp', 'fabWhatsapp'].forEach((id) => ($('#' + id).href = wa));
    $('#waNumber').textContent = SETTINGS.whatsapp || SETTINGS.phone || '—';
    $('#contactInsta').href = SETTINGS.instagram || '#';
    $('#contactFb').href = SETTINGS.facebook || '#';
    $('#contactMap').href = SETTINGS.map_url || '#';
    $('#shopAddress').textContent = SETTINGS.address || 'Tlemcen';
    $('#shopHours').textContent = SETTINGS.hours || '';
    $('#heroAr').textContent = SETTINGS.tagline_ar || '';
    $('#footerTagline').textContent = SETTINGS.tagline || '';
    if (SETTINGS.hero_image) $('#heroImage').src = SETTINGS.hero_image;
    if (SETTINGS.logo_image) $('#brandLogo').src = SETTINGS.logo_image;
    document.title = `${SETTINGS.shop_name || 'La Rosa Fleuriste Tlemcen'} 🌹 — ${SETTINGS.tagline || ''}`;
  };

  const loadFromApi = async () => {
    const j = (r) => { if (!r.ok) throw new Error('api'); return r.json(); };
    const [settings, products, zones, categories, events] = await Promise.all([
      fetch('/api/settings').then(j),
      fetch('/api/products').then(j),
      fetch('/api/zones').then(j),
      fetch('/api/categories').then(j),
      fetch('/api/events').then(j),
    ]);
    return { settings, products, zones, categories, events };
  };

  // Repli statique : catalogue embarqué (site sans backend → commande via WhatsApp)
  const loadFromStatic = async () => {
    const data = await fetch('data/catalog.json').then((r) => {
      if (!r.ok) throw new Error('catalog');
      return r.json();
    });
    STATIC_MODE = true;
    return { events: [], categories: [], ...data };
  };

  const boot = async () => {
    $('#year').textContent = new Date().getFullYear();
    let data;
    try {
      data = await loadFromApi();
    } catch {
      try {
        data = await loadFromStatic();
        console.info('La Rosa : mode statique (commande via WhatsApp).');
      } catch (err) {
        console.error(err);
        toast('⚠️ Impossible de charger la boutique');
        return;
      }
    }
    SETTINGS = data.settings; PRODUCTS = data.products; ZONES = data.zones;
    CATEGORIES = data.categories || [];
    EVENTS = (data.events || []).filter((e) => e.active);
    applySettings();
    applyEvent();
    renderCatRail();
    renderBestSellers();
    renderFilters();
    renderProducts();
    renderZones();
    saveCart();
    observeReveals();
    if (STATIC_MODE) {
      const btn = $('#coSubmit');
      if (btn) btn.textContent = '✅ Commander via WhatsApp';
    }
  };

  const renderZones = () => {
    $('#zonesGrid').innerHTML = ZONES.map((z) => `
      <div class="zone">
        <span class="zone-ico">🛵</span>
        <div><strong>${esc(z.name)}</strong><small>${esc(z.delay)}</small></div>
        <span class="zone-fee">${DA(z.fee)}</span>
      </div>`).join('');
  };

  boot();
})();
