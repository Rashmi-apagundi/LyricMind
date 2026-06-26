/* ======================================================
   LYRICMIND AI — APP ORCHESTRATOR
   ====================================================== */

import { loadState } from './db.js';
import { initAuth } from './auth.js';
import { initJournal } from './journal.js';
import { initAnalysis } from './analysis.js';
import { initProfile } from './profile.js';
import { initMemoryVault } from './memory-vault.js';
import { initSelfReflection } from './self-reflection.js';

/* ── Toast system (exported for other modules) ── */
let toastTimeout = null;

export function showToast(icon, message) {
  const toast = document.getElementById('toast');
  const toastIcon = document.getElementById('toast-icon');
  const toastMsg = document.getElementById('toast-message');

  toastIcon.textContent = icon;
  toastMsg.textContent = message;

  toast.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
  }, 3000);
}

/* ── Page Router ── */
function initRouter(state) {
  const tabs = document.querySelectorAll('.navbar__tab');
  const pages = document.querySelectorAll('.main-content > .page');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.page;

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      pages.forEach(p => {
        p.classList.remove('active');
        p.style.animation = 'none';
      });

      const targetPage = document.getElementById(target);
      // Force reflow to restart animation
      void targetPage.offsetWidth;
      targetPage.style.animation = '';
      targetPage.classList.add('active');

      // Refresh page data when navigated to
      if (target === 'page-analysis') {
        initAnalysis(state);
      }
      if (target === 'page-memory-vault') {
        initMemoryVault(state);
      }
    });
  });
}

/* ── Navbar scroll shadow ── */
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 8) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });
}

/* ── Bootstrap ── */
document.addEventListener('DOMContentLoaded', () => {
  initAuth((state) => {
    initRouter(state);
    initNavbarScroll();
    initJournal(state);
    initAnalysis(state);
    initProfile(state);
    initMemoryVault(state);
    initSelfReflection();

    // Default to Journal tab
    const journalTab = document.querySelector('[data-page="page-journal"]');
    if (journalTab) journalTab.click();
  });
});
