/* ═══════════════════════════════════════════════
   TOLZA — Global JavaScript
   Shared navbar, footer, theme, and utility logic
   ═══════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Dark / Light Mode Toggle ── */
  const THEME_KEY = 'tolza-theme';

  function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  // Apply theme immediately (before DOM paints)
  applyTheme(getPreferredTheme());

  document.addEventListener('DOMContentLoaded', () => {

    /* ── Theme Toggle Button ── */
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });
    }

    /* ── Navbar Scroll Effect ── */
    const navbar = document.querySelector('.g-navbar');
    if (navbar) {
      window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 10);
      }, { passive: true });
    }

    /* ── Mobile Hamburger Menu ── */
    const burger = document.getElementById('gNavBurger');
    const navLinks = document.getElementById('gNavLinks');
    if (burger && navLinks) {
      burger.addEventListener('click', () => {
        navLinks.classList.toggle('mobile-open');
      });
      // Close menu when clicking a link
      navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          navLinks.classList.remove('mobile-open');
        });
      });
    }

    /* ── Smart Back Button ── */
    const backBtn = document.getElementById('gBackBtn');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
          history.back();
        } else {
          // Fallback: go to parent path
          const path = window.location.pathname;
          const parent = path.replace(/\/[^/]*\/?$/, '/') || '/';
          window.location.href = parent;
        }
      });
    }

    /* ── FAQ Accordion ── */
    document.querySelectorAll('.g-faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.g-faq-item');
        const isOpen = item.classList.contains('open');
        // Close all
        document.querySelectorAll('.g-faq-item').forEach(i => i.classList.remove('open'));
        // Toggle current
        if (!isOpen) item.classList.add('open');
      });
    });

    /* ── Intersection Observer for fade-in ── */
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.g-fade-up').forEach(el => observer.observe(el));
  });


  /* ═══════════════════════════════════════
     DRAG & DROP UTILITIES
     ═══════════════════════════════════════ */

  /**
   * Sets up a drag-and-drop upload zone.
   * @param {string} zoneId - The ID of the upload zone element
   * @param {Function} onFiles - Callback that receives FileList
   * @param {Object} [options] - Options: { multiple: false, accept: 'image/*' }
   */
  window.TolzaUpload = function (zoneId, onFiles, options = {}) {
    const zone = document.getElementById(zoneId);
    if (!zone) return;

    const input = zone.querySelector('input[type="file"]');
    if (input) {
      if (options.multiple) input.setAttribute('multiple', '');
      if (options.accept) input.setAttribute('accept', options.accept);

      input.addEventListener('change', (e) => {
        if (e.target.files.length) onFiles(e.target.files);
      });
    }

    // Drag events
    ['dragenter', 'dragover'].forEach(evt => {
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(evt => {
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove('drag-over');
      });
    });

    zone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length) {
        if (input) input.files = files;
        onFiles(files);
      }
    });
  };

  /**
   * Shows a temporary toast notification.
   * @param {string} message
   * @param {number} [duration=3000]
   */
  window.TolzaToast = function (message, duration = 3000) {
    // Remove existing
    const existing = document.querySelector('.g-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'g-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  };

  /**
   * Formats file size for display.
   * @param {number} bytes
   * @returns {string}
   */
  window.TolzaFormatSize = function (bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

})();
