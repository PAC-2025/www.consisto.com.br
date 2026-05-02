// Mobile menu toggle + form tabs

(function () {
  // ====== Mobile menu ======
  const toggle = document.querySelector('.topnav__toggle');
  const menu = document.getElementById('topnav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    // Close menu when a link is clicked
    menu.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ====== Profile tabs (form) ======
  const tabs = document.querySelectorAll('.contact__tab');
  const profileTitle = document.querySelector('.contact__profile-title');
  const profileText = document.querySelector('.contact__profile-text');
  const profiles = {
    rt:      { title: 'Responsável técnico',  text: 'Gerenciamento de múltiplas empresas.' },
    empresa: { title: 'Empresa ou cliente',   text: 'Adesão simples ao convite do RT.' },
    tecnico: { title: 'Técnico de campo',     text: 'Registro de atividades em campo, mesmo offline.' },
  };
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      const key = tab.dataset.tab;
      const p = profiles[key];
      if (p && profileTitle && profileText) {
        profileTitle.textContent = p.title;
        profileText.textContent = p.text;
      }
    });
  });

  // ====== Form submit (no backend) ======
  const form = document.querySelector('.contact__form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      console.log('[Consisto] formulário enviado', data);
      alert('Obrigado! Entraremos em contato em breve.');
      form.reset();
    });
  }
})();
