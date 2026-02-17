(function () {
  "use strict";

  function getFixedHeaderOffset() {
    var nav = document.querySelector(".navbar.fixed-top");
    return nav ? nav.offsetHeight : 0;
  }

  function smoothScrollToHash(event) {
    var link = event.currentTarget;
    var href = link.getAttribute("href");
    if (!href || href.charAt(0) !== "#") {
      return;
    }

    var target = document.querySelector(href);
    if (!target) {
      return;
    }

    event.preventDefault();
    var offset = getFixedHeaderOffset() + 10;
    var top = Math.max(target.getBoundingClientRect().top + window.scrollY - offset, 0);

    window.scrollTo({
      top: top,
      behavior: "smooth"
    });
  }

  function initSmoothScroll() {
    var links = document.querySelectorAll(".page-scroll a");
    links.forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (href.charAt(0) === "#") {
        link.addEventListener("click", smoothScrollToHash);
      }
    });
  }

  function initNavbarShrink() {
    var nav = document.querySelector(".navbar.fixed-top");
    if (!nav) {
      return;
    }

    function updateNavbarState() {
      if (window.scrollY >= 300) {
        nav.classList.add("navbar-shrink");
      } else {
        nav.classList.remove("navbar-shrink");
      }
    }

    updateNavbarState();
    window.addEventListener("scroll", updateNavbarState, { passive: true });
  }

  function initNavbarAutoClose() {
    var navCollapse = document.querySelector(".navbar-collapse");
    var toggler = document.querySelector(".navbar-toggler");
    if (!navCollapse || !toggler || typeof bootstrap === "undefined") {
      return;
    }

    var collapse = bootstrap.Collapse.getOrCreateInstance(navCollapse, { toggle: false });
    navCollapse.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.getComputedStyle(toggler).display === "none") {
          return;
        }
        collapse.hide();
      });
    });
  }

  function initScrollSpy() {
    var nav = document.querySelector(".navbar.fixed-top");
    if (!nav || typeof bootstrap === "undefined") {
      return;
    }

    if (!nav.querySelector("a[href^='#']")) {
      return;
    }

    bootstrap.ScrollSpy.getOrCreateInstance(document.body, {
      target: ".navbar",
      offset: getFixedHeaderOffset() + 20
    });
  }

  function initFloatingLabels() {
    document.querySelectorAll(".floating-label-form-group input, .floating-label-form-group textarea").forEach(function (field) {
      var wrapper = field.closest(".floating-label-form-group");
      if (!wrapper) {
        return;
      }

      function sync() {
        wrapper.classList.toggle("floating-label-form-group-with-value", field.value.trim().length > 0);
      }

      field.addEventListener("input", sync);
      field.addEventListener("focus", function () {
        wrapper.classList.add("floating-label-form-group-with-focus");
      });
      field.addEventListener("blur", function () {
        wrapper.classList.remove("floating-label-form-group-with-focus");
        sync();
      });
      sync();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initSmoothScroll();
    initNavbarShrink();
    initNavbarAutoClose();
    initScrollSpy();
    initFloatingLabels();
  });
})();
