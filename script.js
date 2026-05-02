// Mobile menu toggle + form tabs + leads API integration

(function () {
  const API_URL = 'https://app.consisto.com.br/api/leads';
  const UTM_KEYS = ['utmSource', 'utmMedium', 'utmCampaign', 'utmTerm', 'utmContent'];
  const UTM_STORAGE = 'consisto:utms';

  // ====== Mobile menu ======
  const toggle = document.querySelector('.topnav__toggle');
  const menu = document.getElementById('topnav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    menu.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ====== UTM capture (first visit wins, persisted in sessionStorage) ======
  const captureUTMs = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = {};
      const map = {
        utm_source: 'utmSource', utm_medium: 'utmMedium', utm_campaign: 'utmCampaign',
        utm_term: 'utmTerm', utm_content: 'utmContent',
      };
      let any = false;
      for (const [src, dst] of Object.entries(map)) {
        const v = params.get(src);
        if (v) { fromUrl[dst] = v.slice(0, 100); any = true; }
      }
      if (any && !sessionStorage.getItem(UTM_STORAGE)) {
        sessionStorage.setItem(UTM_STORAGE, JSON.stringify(fromUrl));
      }
    } catch (_) { /* sessionStorage may be blocked */ }
  };
  const getStoredUTMs = () => {
    try { return JSON.parse(sessionStorage.getItem(UTM_STORAGE) || '{}'); }
    catch (_) { return {}; }
  };
  captureUTMs();

  // ====== Profile tabs (form) ======
  const form = document.querySelector('.contact__form');
  const tabs = document.querySelectorAll('.contact__tab');
  const profileTitle = document.querySelector('.contact__profile-title');
  const profileText = document.querySelector('.contact__profile-text');
  const profiles = {
    rt:      { title: 'Responsável técnico', text: 'Gerenciamento de múltiplas empresas.', tipo: 'responsavel_tecnico' },
    empresa: { title: 'Empresa ou cliente',  text: 'Adesão simples ao convite do RT.',     tipo: 'empresa' },
    tecnico: { title: 'Técnico de campo',    text: 'Registro de atividades em campo, mesmo offline.', tipo: 'responsavel_tecnico' },
  };
  const setTab = (key) => {
    const p = profiles[key];
    if (!p) return;
    tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.tab === key));
    if (profileTitle) profileTitle.textContent = p.title;
    if (profileText) profileText.textContent = p.text;
    if (form) form.dataset.tipo = p.tipo;
  };
  tabs.forEach((tab) => tab.addEventListener('click', () => setTab(tab.dataset.tab)));

  // ====== Phone mask (BR) ======
  const formatPhone = (value) => {
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length === 0) return '';
    if (d.length < 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };
  const phone = form && form.querySelector('input[name="whatsapp"]');
  if (phone) phone.addEventListener('input', (e) => { e.target.value = formatPhone(e.target.value); });

  // ====== Validators ======
  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const parsePhone = (masked) => {
    const d = masked.replace(/\D/g, '');
    if (d.length !== 10 && d.length !== 11) return null;
    const ddd = d.slice(0, 2);
    const rest = d.slice(2);
    let telefone;
    if (rest.length === 9) telefone = `${rest[0]} ${rest.slice(1, 5)}-${rest.slice(5)}`;
    else telefone = `${rest.slice(0, 4)}-${rest.slice(4)}`;
    return { ddd, telefone, telefoneCompleto: `(${ddd}) ${telefone}` };
  };

  const validate = (v) => {
    const errors = {};
    if (!v.nome || v.nome.trim().length < 3) errors.nome = 'Informe seu nome completo.';
    if (!v.email || !isValidEmail(v.email)) errors.email = 'Informe um e-mail válido.';
    if (!parsePhone(v.whatsapp || '')) errors.whatsapp = 'Informe um WhatsApp válido com DDD.';
    return errors;
  };

  const buildPayload = (tipo, v) => {
    const phoneParts = parsePhone(v.whatsapp);
    const payload = {
      tipo,
      nome: v.nome.trim(),
      email: v.email.trim(),
      ddd: phoneParts.ddd,
      telefone: phoneParts.telefone,
      telefoneCompleto: phoneParts.telefoneCompleto,
      submittedAt: new Date().toISOString(),
    };
    if (tipo === 'empresa') payload.razaoSocial = '';
    const utms = getStoredUTMs();
    for (const k of UTM_KEYS) if (utms[k]) payload[k] = utms[k];
    return payload;
  };

  // ====== Form submit ======
  if (form) {
    const errorBox = form.querySelector('.contact__error');
    const submitBtn = form.querySelector('button[type="submit"]');
    const showError = (msg, isSuccess = false) => {
      if (!errorBox) return;
      errorBox.textContent = Array.isArray(msg) ? msg.join(' ') : msg;
      errorBox.hidden = !msg;
      errorBox.classList.toggle('contact__error--success', !!isSuccess);
    };
    const clearFieldErrors = () => {
      form.querySelectorAll('.field__input--invalid').forEach((i) => i.classList.remove('field__input--invalid'));
    };
    const markFields = (errors) => {
      clearFieldErrors();
      for (const name of Object.keys(errors)) {
        const el = form.querySelector(`[name="${name}"]`);
        if (el) el.classList.add('field__input--invalid');
      }
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showError('');
      clearFieldErrors();

      const tipo = form.dataset.tipo === 'empresa' ? 'empresa' : 'responsavel_tecnico';
      const values = Object.fromEntries(new FormData(form).entries());
      const errors = validate(values);
      if (Object.keys(errors).length > 0) {
        markFields(errors);
        showError(Object.values(errors));
        return;
      }

      const payload = buildPayload(tipo, values);
      submitBtn.disabled = true;
      const originalLabel = submitBtn.textContent;
      submitBtn.textContent = 'Enviando...';

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.status === 201) {
          form.reset();
          setTab('rt');
          showError('Obrigado! Entraremos em contato em breve.', true);
        } else if (res.status === 400) {
          const body = await res.json().catch(() => ({}));
          showError(body.message || 'Verifique os dados informados.');
        } else if (res.status === 409) {
          markFields({ email: true });
          const body = await res.json().catch(() => ({}));
          showError(body.message || 'Este e-mail já foi cadastrado.');
        } else if (res.status === 429) {
          showError('Muitas tentativas. Aguarde um instante e tente novamente.');
        } else {
          showError('Não foi possível enviar agora. Tente novamente em instantes.');
        }
      } catch (_) {
        showError('Erro de conexão. Verifique sua internet e tente novamente.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    });
  }
})();
