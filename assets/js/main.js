// Bean Cofy - main.js
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.site-nav');
  const navToggle = document.getElementById('navToggle');
  const rootMenus = Array.from(document.querySelectorAll('.site-nav .menu-root'));
  const submenuItems = Array.from(document.querySelectorAll('.has-submenu'));
  const mmMobile = window.matchMedia('(max-width: 768px)');

  // ---------- Helpers ----------
  const setAttr = (el, name, val) => el && el.setAttribute(name, String(val));
  const setExpanded = (li, open) => {
    const a = li.querySelector('a');
    setAttr(a, 'aria-expanded', open);
    li.classList.toggle('open', open);
  };
  const closeAllSubmenus = () => submenuItems.forEach(li => setExpanded(li, false));
  const closeNav = () => {
    if (!nav) return;
    setAttr(navToggle, 'aria-expanded', false);
    setAttr(nav, 'aria-expanded', false);
    closeAllSubmenus();
  };

  // ---------- Mobile nav toggle ----------
  if (nav && navToggle && rootMenus.length) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      setAttr(navToggle, 'aria-expanded', !expanded);
      setAttr(nav, 'aria-expanded', !expanded);
      if (expanded) closeAllSubmenus();
    });

    // Close nav on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeNav();
    });

    // Close nav if resizing to desktop
    mmMobile.addEventListener('change', (e) => {
      if (!e.matches) closeNav();
    });
  }

  // ---------- Submenus (mobile + keyboard) ----------
  submenuItems.forEach(li => setExpanded(li, false));

  // Caret button toggles submenu
  submenuItems.forEach((li) => {
    const btn = li.querySelector('.submenu-toggle');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = li.classList.contains('open');
        if (mmMobile.matches) {
          submenuItems.forEach(x => x !== li && setExpanded(x, false));
        }
        setExpanded(li, !isOpen);
      });
    }
  });

  // First tap on parent link opens submenu on mobile; second tap follows link
  submenuItems.forEach((li) => {
    const link = li.querySelector('a');
    if (!link) return;
    link.addEventListener('click', (e) => {
      if (!mmMobile.matches) return; // desktop: do nothing
      const isOpen = li.classList.contains('open');
      if (!isOpen) {
        e.preventDefault();
        submenuItems.forEach(x => x !== li && setExpanded(x, false));
        setExpanded(li, true);
      }
    });
  });

  // Keyboard support
  submenuItems.forEach((li) => {
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        setExpanded(li, false);
        li.querySelector('a')?.focus();
      }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && li.classList.contains('open')) {
        const links = Array.from(li.querySelectorAll('.submenu a'));
        if (!links.length) return;
        e.preventDefault();
        const current = document.activeElement;
        let idx = Math.max(0, links.indexOf(current));
        idx += e.key === 'ArrowDown' ? 1 : -1;
        if (idx < 0) idx = links.length - 1;
        if (idx >= links.length) idx = 0;
        links[idx].focus();
      }
    });
  });

  // Click outside closes submenus (and closes mobile nav if open)
  document.addEventListener('click', (e) => {
    const clickedInsideNav = nav?.contains(e.target);
    if (!clickedInsideNav) {
      closeAllSubmenus();
      if (mmMobile.matches) closeNav();
    }
  });

  // ---------- Contact form messages (if present) ----------
  const contactForm = document.getElementById('contactForm');
  const contactStatus = document.getElementById('formStatus');
  if (contactForm && contactStatus) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contactForm.checkValidity()) {
        contactStatus.textContent = 'Please fix errors in the form (check required fields & formats).';
        contactStatus.style.color = 'tomato';
        contactForm.reportValidity();
        return;
      }
      contactStatus.textContent = 'Thanks! Your booking request has been sent.';
      contactStatus.style.color = 'green';
      contactForm.reset();
    });
  }

  // ---------- QUICK VIEW (menu.html) ----------
  (function initQuickView(){
    // Chỉ chạy nếu có danh sách sản phẩm và phần modal
    const containers = document.querySelectorAll('#coffee-list, #tea-list');
    const dlg = document.getElementById('quickView');
    const img = document.getElementById('qv-img');
    const title = document.getElementById('qv-title');
    const price = document.getElementById('qv-price');
    const desc = document.getElementById('qv-desc');
    const btnOrder = document.getElementById('qv-order');
    const btnClose = document.getElementById('qvClose');
    if (!containers.length || !dlg || !img || !title || !price || !desc || !btnOrder) return;

    const fmt = v => Number(v||0).toLocaleString('vi-VN') + ' đ';

    function openQV(card){
      const id = card.id || card.dataset.name || '';
      const name = card.querySelector('h3')?.textContent?.trim() || id;
      const p = card.dataset.price || '0';
      const src = card.querySelector('img.thumb')?.getAttribute('src') || '';
      const text = card.querySelector('p')?.textContent || '';

      title.textContent = name;
      price.textContent = 'Giá: ' + fmt(p);
      desc.textContent = text;
      img.src = src; img.alt = name;

      btnOrder.href = '/contact.html?item=' + encodeURIComponent(id);
      dlg.style.display = 'block';
      dlg.setAttribute('aria-hidden', 'false');
    }

    function closeQV(){
      dlg.style.display = 'none';
      dlg.setAttribute('aria-hidden', 'true');
    }

    containers.forEach(container => {
      container.addEventListener('click', (e)=>{
        const card = e.target.closest('.product-card');
        if (!card || !container.contains(card)) return;
        openQV(card);
      });
    });

    btnClose?.addEventListener('click', closeQV);
    dlg.addEventListener('click', (e)=>{ if (e.target === dlg) closeQV(); });
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && dlg.style.display==='block') closeQV(); });
  })();

  // ---------- ORDER PREFILL (contact.html) ----------
  (function prefillOrderFromQuery(){
    const orderForm = document.getElementById('orderForm');
    const itemSel = document.getElementById('item');
    const sizeRadios = Array.from(document.querySelectorAll('input[name="size"]'));

    if (!orderForm || !itemSel) return; // chỉ chạy ở contact.html

    const params = new URLSearchParams(location.search);
    const itemParam = params.get('item');           // ví dụ: espresso
    const sizeParam = (params.get('size') || '').toUpperCase(); // S/M/L (tuỳ chọn)

    if (itemParam) {
      const idx = Array.from(itemSel.options).findIndex(o => o.value === itemParam);
      if (idx >= 0) itemSel.selectedIndex = idx;
    }
    if (sizeParam && ['S','M','L'].includes(sizeParam)) {
      const r = sizeRadios.find(x => x.value === sizeParam);
      if (r) r.checked = true;
    }

    // Cuộn đến form để người dùng thao tác luôn
    document.getElementById('order-title')?.scrollIntoView({behavior:'smooth', block:'start'});
  })();
});

// Newsletter demo (home)
window.fakeSubmit = (e) => {
  e.preventDefault();
  const email = document.getElementById('news-email');
  const out = document.getElementById('news-output');
  if (email && email.reportValidity()) {
    out.textContent = `Subscribed: ${email.value} 🎉`;
    email.value = '';
  }
  return false;
};
