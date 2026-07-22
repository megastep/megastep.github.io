(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var darkMode = window.matchMedia("(prefers-color-scheme: dark)");
  var lastDialogTrigger = null;
  var ignoreDialogClose = false;

  function dialogReturnUrl() {
    var state = window.history.state;
    if (state && state.projectDialog && state.returnUrl) return state.returnUrl;
    return window.location.pathname + window.location.search + "#portfolio";
  }

  function effectiveTheme() {
    return document.documentElement.dataset.theme || (darkMode.matches ? "dark" : "light");
  }

  function syncThemeToggle() {
    var toggle = document.querySelector(".theme-toggle");
    if (!toggle) return;

    var theme = effectiveTheme();
    var nextTheme = theme === "dark" ? "light" : "dark";
    toggle.dataset.effectiveTheme = theme;
    toggle.setAttribute("aria-label", "Switch to " + nextTheme + " theme");
  }

  function initTheme() {
    var toggle = document.querySelector(".theme-toggle");
    syncThemeToggle();

    if (toggle) {
      toggle.addEventListener("click", function () {
        var nextTheme = effectiveTheme() === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = nextTheme;
        try {
          window.localStorage.setItem("site-theme", nextTheme);
        } catch (error) {
          // Storage can be unavailable in private or restricted contexts.
        }
        syncThemeToggle();
      });
    }

    function syncSystemTheme() {
      if (!document.documentElement.dataset.theme) syncThemeToggle();
    }

    if (typeof darkMode.addEventListener === "function") {
      darkMode.addEventListener("change", syncSystemTheme);
    } else if (typeof darkMode.addListener === "function") {
      darkMode.addListener(syncSystemTheme);
    }
  }

  function closeMenu() {
    var menu = document.querySelector(".site-nav__menu");
    var button = document.querySelector(".site-nav__menu-button");
    if (!menu || !button) return;
    menu.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
  }

  function initNavigation() {
    var menu = document.querySelector(".site-nav__menu");
    var button = document.querySelector(".site-nav__menu-button");
    if (!menu || !button) return;

    button.addEventListener("click", function () {
      var open = !menu.classList.contains("is-open");
      menu.classList.toggle("is-open", open);
      button.setAttribute("aria-expanded", String(open));
    });

    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menu.classList.contains("is-open")) {
        closeMenu();
        button.focus();
      }
    });

    document.addEventListener("click", function (event) {
      if (!menu.classList.contains("is-open")) return;
      if (!menu.contains(event.target) && event.target !== button) closeMenu();
    });
  }

  function showDialog(dialog, trigger) {
    if (!dialog || typeof dialog.showModal !== "function") return;
    document.querySelectorAll(".project-dialog[open]").forEach(function (openDialog) {
      if (openDialog !== dialog) {
        ignoreDialogClose = true;
        openDialog.close();
        ignoreDialogClose = false;
      }
    });
    lastDialogTrigger = trigger || document.querySelector('[href="#' + dialog.id + '"]');
    if (!dialog.open) {
      dialog.showModal();
      var closeButton = dialog.querySelector("[data-dialog-close]");
      if (closeButton) closeButton.focus();
    }
  }

  function syncDialogFromLocation() {
    if (!window.location.hash) {
      document.querySelectorAll(".project-dialog[open]").forEach(function (dialog) {
        ignoreDialogClose = true;
        dialog.close();
        ignoreDialogClose = false;
      });
      return;
    }

    var target = document.querySelector(window.location.hash);
    if (target && target.matches(".project-dialog")) {
      showDialog(target, null);
      return;
    }

    document.querySelectorAll(".project-dialog[open]").forEach(function (dialog) {
      ignoreDialogClose = true;
      dialog.close();
      ignoreDialogClose = false;
    });
  }

  function closeDialog(dialog) {
    if (!dialog || !dialog.open) return;
    dialog.close();
  }

  function restoreDialogFocus() {
    if (!lastDialogTrigger || !document.contains(lastDialogTrigger)) return;
    window.setTimeout(function () {
      lastDialogTrigger.focus({ preventScroll: true });
    }, 50);
  }

  function handleDialogHistoryChange() {
    syncDialogFromLocation();
    if (!document.querySelector(".project-dialog[open]")) restoreDialogFocus();
  }

  function initDialogs() {
    document.querySelectorAll("[data-project-open]").forEach(function (trigger) {
      trigger.addEventListener("click", function (event) {
        var selector = trigger.getAttribute("href");
        var dialog = selector ? document.querySelector(selector) : null;
        if (!dialog) return;
        event.preventDefault();
        lastDialogTrigger = trigger;
        window.history.pushState({
          projectDialog: dialog.id,
          returnUrl: window.location.pathname + window.location.search + window.location.hash
        }, "", selector);
        showDialog(dialog, trigger);
      });
    });

    document.querySelectorAll(".project-dialog").forEach(function (dialog) {
      dialog.querySelectorAll("[data-dialog-close]").forEach(function (button) {
        button.addEventListener("click", function () {
          closeDialog(dialog);
        });
      });

      dialog.addEventListener("click", function (event) {
        if (event.target === dialog) closeDialog(dialog);
      });

      dialog.addEventListener("close", function () {
        if (!ignoreDialogClose && window.location.hash === "#" + dialog.id) {
          window.history.replaceState(null, "", dialogReturnUrl());
        }

        restoreDialogFocus();
      });
    });

    window.addEventListener("popstate", handleDialogHistoryChange);
    syncDialogFromLocation();
  }

  function initReveals() {
    var elements = document.querySelectorAll(".reveal");
    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      elements.forEach(function (element) { element.classList.add("is-visible"); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10%", threshold: 0.12 });

    elements.forEach(function (element) { observer.observe(element); });
  }

  function initHero() {
    var hero = document.querySelector(".hero");
    if (!hero) return;
    window.requestAnimationFrame(function () { hero.classList.add("is-ready"); });
  }

  function initScrollSignals() {
    var signals = Array.prototype.map.call(
      document.querySelectorAll(".contact__signal, .signal--hero, .section-separator"),
      function (element) { return { element: element, settleTimer: null }; }
    );
    if (!signals.length || reduceMotion.matches) return;

    window.addEventListener("scroll", function () {
      signals.forEach(function (signal) {
        signal.element.classList.add("is-scrolling");
        window.clearTimeout(signal.settleTimer);
        signal.settleTimer = window.setTimeout(function () {
          signal.element.classList.remove("is-scrolling");
        }, 180);
      });
    }, { passive: true });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initNavigation();
    initDialogs();
    initReveals();
    initHero();
    initScrollSignals();
  });
}());
