// ==================== PERFORMANCE UTILITIES ====================
const rafThrottle = (fn) => {
  let ticking = false;
  return (...args) => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        fn(...args);
        ticking = false;
      });
    }
  };
};

const debounce = (fn, ms) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

// ==================== COUNTER ANIMATION ====================
const createCounterAnimation = (element, target, from = 0) => {
  let current = from;
  const increment = (target - from) / 60;
  const animate = () => {
    current += increment;
    if (current >= target) {
      element.textContent = Math.floor(target);
      return;
    }
    element.textContent = Math.floor(current);
    requestAnimationFrame(animate);
  };
  animate();
};

// ==================== SCROLL ANIMATIONS (IntersectionObserver) ====================
const createScrollSlideAnimator = () => {
  const animatedElements = new Set();
  const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animatedElements.has(entry.target)) {
        entry.target.classList.add("animate");
        animatedElements.add(entry.target);
        if (entry.target.classList.contains("stat-item")) {
          const numberEl = entry.target.querySelector(".stat-number");
          const target = parseInt(numberEl.dataset.target);
          createCounterAnimation(numberEl, target, parseInt(numberEl.dataset.from || 0));
        }
      }
    });
  }, observerOptions);

  const elements = document.querySelectorAll(
    ".section-title, .section-subtitle, .card, .timeline-item, .stat-item, .about-why-item, .main-tl"
  );
  elements.forEach((el, i) => {
    if (el.classList.contains("card")) {
      el.style.transitionDelay = `${i * 0.1}s`;
    }
    observer.observe(el);
  });

  // Hover re-trigger for stat counters
  document.querySelectorAll(".stat-item").forEach(item => {
    const numberEl = item.querySelector(".stat-number");
    const target = parseInt(numberEl.dataset.target);
    item.addEventListener("mouseenter", () => {
      if (!item.classList.contains("animate")) {
        createCounterAnimation(numberEl, target, parseInt(numberEl.dataset.from || 0));
      }
    });
  });
};

// ==================== TEXT REVEALS (GSAP) ====================
const setupTextReveals = () => {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  // Vision Text Reveal
  const visionWords = gsap.utils.toArray('.vision-reveal-section .reveal-word');
  const visionSection = document.querySelector('.vision-reveal-section');
  if (visionSection && visionWords.length > 0) {
    ScrollTrigger.create({
      trigger: visionSection,
      start: "top 80%",
      end: "bottom 20%",
      scrub: 1,
      onUpdate: (self) => {
        const wordsToReveal = Math.floor(self.progress * visionWords.length * 1.5);
        visionWords.forEach((word, index) => {
          word.classList.toggle('active', index <= wordsToReveal);
        });
      }
    });
  }

  // Clarity Text Reveal
  const clarityWords = gsap.utils.toArray('.clarity-section .reveal-word');
  const claritySection = document.querySelector('.clarity-section');
  if (claritySection && clarityWords.length > 0) {
    ScrollTrigger.create({
      trigger: claritySection,
      start: "top 80%",
      end: "top 20%",
      scrub: 1,
      onUpdate: (self) => {
        const wordsToReveal = Math.floor(self.progress * clarityWords.length * 1.5);
        clarityWords.forEach((word, index) => {
          word.classList.toggle('active', index <= wordsToReveal);
        });
      }
    });
  }

  // Diagonal Stack Animation for Clarity Cards
  const clarityCards = gsap.utils.toArray('.clarity-card');
  if (claritySection && clarityCards.length > 0) {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: claritySection,
        start: "top top",
        end: "+=300%",
        pin: true,
        scrub: 1,
        anticipatePin: 1
      }
    });

    clarityCards.forEach((card, index) => {
      gsap.set(card, {
        x: 150, y: 150, rotate: 8, opacity: 0, scale: 0.8, zIndex: index
      });
      tl.to(card, {
        x: 0, y: 0, rotate: 0, opacity: 1, scale: 1, duration: 1, ease: "power2.out"
      }, index > 0 ? ">-0.5" : 0);
      if (index > 0) {
        tl.to(clarityCards[index - 1], {
          scale: 0.9, opacity: 0.4, y: -40, filter: "blur(4px)", duration: 1
        }, "<");
      }
      tl.to({}, { duration: 0.5 });
    });
  }
};

// ==================== CARD STACKING (GSAP) ====================
const setupCardStacking = () => {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  const cards = gsap.utils.toArray('.glass-card');
  if (cards.length === 0) return;

  cards.forEach((card, index) => {
    if (index > 0) {
      gsap.to(cards[index - 1], {
        scrollTrigger: {
          trigger: card,
          start: "top bottom",
          end: "top 10vh",
          scrub: true
        },
        scale: 0.9,
        opacity: 0.6,
        filter: "blur(2px)",
        transformOrigin: "top center",
        ease: "none"
      });
    }
  });
};

// ==================== ROADMAP STEP HOVER ====================
const setupRoadmapStepHover = () => {
  const steps = Array.from(document.querySelectorAll(".roadmap-steps .step"));
  const cards = Array.from(document.querySelectorAll(".process-cards-stack .glass-card"));
  if (!steps.length || !cards.length) return;

  const setActiveStep = index => {
    steps.forEach((s, i) => s.classList.toggle("active", i === index));
  };

  steps.forEach((step, index) => {
    const card = cards[index];
    if (!card) return;
    const activate = () => {
      setActiveStep(index);
      scrollToTarget(card, -window.innerHeight * 0.1);
    };
    // Hover only highlights; scrolling the page on hover was jarring.
    step.addEventListener("mouseenter", () => setActiveStep(index));
    step.addEventListener("click", (e) => { e.preventDefault(); activate(); });
  });

  // IntersectionObserver for scroll tracking
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const index = cards.indexOf(entry.target);
        if (index !== -1) setActiveStep(index);
      }
    });
  }, { root: null, rootMargin: "-40% 0px -40% 0px", threshold: 0 });
  cards.forEach(card => observer.observe(card));
};

// ==================== ABOUT TESTIMONIAL SLIDER ====================
const setupAboutTestimonialSlider = () => {
  const slides = Array.from(document.querySelectorAll('.about-testimonial-slide'));
  const avatars = Array.from(document.querySelectorAll('.about-testimonial-avatar'));
  if (slides.length === 0 || avatars.length === 0) return;

  let current = 0;
  let intervalId = null;

  const showSlide = (index) => {
    slides.forEach((s, i) => s.classList.toggle('about-testimonial-slide--active', i === index));
    avatars.forEach((a, i) => a.classList.toggle('about-testimonial-avatar--active', i === index));
    current = index;
  };

  const startAuto = () => { if (!intervalId) intervalId = setInterval(() => showSlide((current + 1) % slides.length), 6000); };
  const stopAuto = () => { clearInterval(intervalId); intervalId = null; };

  avatars.forEach((avatar, i) => {
    avatar.addEventListener('click', () => { stopAuto(); showSlide(i); startAuto(); });
  });

  const slider = document.querySelector('.about-testimonial-slider');
  if (slider) {
    slider.addEventListener('mouseenter', stopAuto);
    slider.addEventListener('mouseleave', startAuto);
  }
  showSlide(0);
  startAuto();
};

// ==================== PANEL CAROUSEL (VALUES SECTION) ====================
const initializePanelCarousels = () => {
  const scrollContainers = document.querySelectorAll(".scroll-container");

  scrollContainers.forEach((scrollContainer) => {
    const panels = scrollContainer.querySelectorAll(".panel");
    const stickyHeading = scrollContainer.closest(".scroll-container-parent")?.querySelector(".sticky-heading");

    // Cache panel widths to avoid layout thrashing
    let cachedTotalPanelWidth = 0;
    const updatePanelWidthCache = () => {
      cachedTotalPanelWidth = Array.from(panels).reduce(
        (total, panel) => total + panel.offsetWidth + 350, 0
      );
    };
    updatePanelWidthCache();

    function calculateCardTransform(panel) {
      const panelRect = panel.getBoundingClientRect();
      const normalizedPosition = (panelRect.left + panelRect.width / 2) / 1900;

      let rotation = 0;
      if (normalizedPosition <= 0.3) rotation = -7.5 * (1 - normalizedPosition * 3);
      else if (normalizedPosition >= 0.7) rotation = 7.5 * ((normalizedPosition - 0.7) * 3.33);

      const verticalPosition = panelRect.top / window.innerHeight;
      const yOffset = Math.round((Math.sin(verticalPosition * Math.PI) * 15 - 10) * 10) / 10;
      const smoothRotation = Math.round(rotation * 100) / 100;

      return `translateY(${yOffset}px) rotate(${smoothRotation}deg)`;
    }

    const handleScroll = rafThrottle(() => {
      const scrollContainerParent = scrollContainer.closest(".scroll-container-parent");
      const parentRect = scrollContainerParent.getBoundingClientRect();
      const parentTop = window.pageYOffset + parentRect.top;
      const parentHeight = parentRect.height;
      const viewportHeight = window.innerHeight;
      const scrollTop = window.scrollY;
      const scrollProgress = (scrollTop - parentTop) / (parentHeight - viewportHeight);
      const clampedProgress = Math.max(0, Math.min(1, scrollProgress));

      // The container is position:fixed and parked just off the right edge; its
      // rotated first card used to peek into view on every other section.
      const sectionInView = parentRect.top < viewportHeight && parentRect.bottom > 0;
      scrollContainer.style.visibility = sectionInView && clampedProgress > 0 ? "visible" : "hidden";

      if (stickyHeading) {
        stickyHeading.style.opacity = 1 - Math.min(1, clampedProgress * 2);
      }

      if (clampedProgress > 0 && clampedProgress <= 0.5) {
        scrollContainer.style.right = "0";
        // Undo the horizontal slide from the second half when scrolling back up.
        scrollContainer.style.transform = "translateY(-50%) translateX(0)";
        const individualProgress = Math.max(0, Math.min(1, clampedProgress * 2));
        panels.forEach((panel) => {
          panel.style.transform = `translateX(${(1 - individualProgress) * 100}%) ${calculateCardTransform(panel)}`;
        });
      }

      if (clampedProgress > 0.5) {
        const smoothedTranslateX = -cachedTotalPanelWidth * ((clampedProgress - 0.5) * 1.5) * 0.8;
        scrollContainer.style.transform = `translateY(-50%) translateX(${smoothedTranslateX}px)`;

        panels.forEach((panel, index) => {
          const leftScrollProgress = (clampedProgress - 0.5) * 2;
          const panelProgress = Math.max(0, Math.min(1, leftScrollProgress - index * 0.1));
          const scale = 1 - panelProgress * 0.05;
          panel.style.transform = `scale(${scale}) ${calculateCardTransform(panel)}`;
          panel.style.opacity = 1 - panelProgress * 0.2;
        });

        if (stickyHeading) {
          const opacityProgress = (clampedProgress - 0.5) * 2;
          stickyHeading.style.opacity = Math.max(0, 1 - Math.pow(1 - opacityProgress, 3));
        }
      }

      if (clampedProgress === 0) {
        scrollContainer.style.right = "-100%";
        scrollContainer.style.transform = "translateY(-50%) translateX(0)";
        if (stickyHeading) stickyHeading.style.opacity = 1;
        panels.forEach((panel) => {
          panel.style.transform = calculateCardTransform(panel);
          panel.style.opacity = 1;
        });
      }

      if (stickyHeading) {
        if (parentRect.top <= 0 && parentRect.bottom > 0) {
          stickyHeading.style.position = "fixed";
          stickyHeading.style.top = "50%";
        } else {
          stickyHeading.style.position = "absolute";
          stickyHeading.style.top = "450px";
        }
      }
    });

    panels.forEach((panel) => {
      panel.style.transform = calculateCardTransform(panel);
    });

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    window.addEventListener("resize", debounce(() => {
      updatePanelWidthCache();
      handleScroll();
    }, 200));
  });
};

// ==================== MOBILE NAVIGATION ====================
const setupMobileNav = () => {
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
  const mobileMenuClose = document.getElementById('mobileMenuClose');
  const mobileMenuLinks = document.querySelectorAll('.mobile-menu-link');
  const navLinks = document.querySelectorAll('.nav-link');

  if (!mobileToggle || !mobileMenu) return;

  const openMobileMenu = () => {
    mobileToggle.classList.add('active');
    mobileMenu.classList.add('active');
    mobileMenuOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeMobileMenu = () => {
    mobileToggle.classList.remove('active');
    mobileMenu.classList.remove('active');
    mobileMenuOverlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  mobileToggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    mobileMenu.classList.contains('active') ? closeMobileMenu() : openMobileMenu();
  });

  mobileMenuClose?.addEventListener('click', (e) => { e.preventDefault(); closeMobileMenu(); });
  mobileMenuOverlay?.addEventListener('click', closeMobileMenu);

  mobileMenuLinks.forEach(link => {
    link.addEventListener('click', function() {
      closeMobileMenu();
      mobileMenuLinks.forEach(l => l.classList.remove('active'));
      this.classList.add('active');
      const href = this.getAttribute('href');
      navLinks.forEach(navLink => {
        navLink.classList.remove('active');
        if (navLink.getAttribute('href') === href) navLink.classList.add('active');
      });
    });
  });

  navLinks.forEach(link => {
    link.addEventListener('click', function() {
      closeMobileMenu();
      navLinks.forEach(l => l.classList.remove('active'));
      if (!this.classList.contains('cta-button')) {
        this.classList.add('active');
        const href = this.getAttribute('href');
        mobileMenuLinks.forEach(ml => {
          ml.classList.remove('active');
          if (ml.getAttribute('href') === href) ml.classList.add('active');
        });
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('active')) closeMobileMenu();
  });

  // Navbar scroll effect - throttled
  window.addEventListener('scroll', rafThrottle(() => {
    const navbar = document.querySelector('.navbar-container');
    if (!navbar) return;
    navbar.classList.toggle('scrolled', (window.pageYOffset || document.documentElement.scrollTop) > 50);
  }), { passive: true });

  window.addEventListener('resize', debounce(() => {
    if (window.innerWidth > 992 && mobileMenu.classList.contains('active')) closeMobileMenu();
  }, 200));

  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) scrollToTarget(target);
    });
  });

  // Mobile CTA glow effect
  const mobileCtaButton = document.querySelector('.mobile-cta-button');
  if (mobileCtaButton) {
    mobileCtaButton.addEventListener('mousemove', function(e) {
      const rect = this.getBoundingClientRect();
      this.style.setProperty('--cloud-x', ((e.clientX - rect.left) / rect.width) * 100 + '%');
      this.style.setProperty('--cloud-y', ((e.clientY - rect.top) / rect.height) * 100 + '%');
    });
  }
};

// ==================== CONTACT FORM MODAL ====================
const setupContactModal = () => {
  const modal = document.getElementById("contactModal");
  if (!modal) return;

  const ctaButtons = document.querySelectorAll(".cta-button, .mobile-cta-button, .cloud-cta-button, .a3d-cta");
  const closeModal = document.querySelector(".close-modal");
  const contactForm = document.getElementById("contactForm");

  const openModal = () => {
    modal.style.display = "block";
    setTimeout(() => modal.classList.add("show"), 10);
  };
  const closeModalFn = () => {
    modal.classList.remove("show");
    setTimeout(() => { modal.style.display = "none"; }, 300);
  };

  ctaButtons.forEach(btn => {
    btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); openModal(); });
  });
  closeModal?.addEventListener("click", closeModalFn);
  window.addEventListener("click", (e) => { if (e.target === modal) closeModalFn(); });

  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const submitBtn = contactForm.querySelector('.submit-btn');
      const originalText = submitBtn.innerText;
      const payload = Object.fromEntries(new FormData(contactForm));

      submitBtn.innerText = "Sending...";
      submitBtn.disabled = true;

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(r => r.json().catch(() => ({})))
        .then(data => {
          if (data.status === 'success') {
            submitBtn.innerText = "Message Sent!";
            submitBtn.style.background = "#4CAF50";
            setTimeout(() => {
              closeModalFn();
              setTimeout(() => {
                contactForm.reset();
                submitBtn.innerText = originalText;
                submitBtn.style.background = "#051C2C";
                submitBtn.disabled = false;
              }, 300);
            }, 1500);
          } else throw new Error(data.message || 'Submission failed');
        })
        .catch((err) => {
          submitBtn.innerText = "Error!";
          submitBtn.style.background = "#ff4444";
          alert(err.message || "There was an error sending your message. Please try again later.");
          setTimeout(() => {
            submitBtn.innerText = originalText;
            submitBtn.style.background = "#051C2C";
            submitBtn.disabled = false;
          }, 3000);
        });
    });
  }
};

// ==================== PILLARS CAROUSEL ====================
const setupPillarsCarousel = () => {
  const carousel = document.getElementById('pillarsCarousel');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  if (!carousel || !prevBtn || !nextBtn) return;

  const scrollAmount = 350;
  prevBtn.addEventListener('click', () => carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' }));
  nextBtn.addEventListener('click', () => carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' }));

  let isDown = false, startX, scrollLeft;
  carousel.addEventListener('mousedown', (e) => {
    isDown = true; startX = e.pageX - carousel.offsetLeft; scrollLeft = carousel.scrollLeft;
    carousel.style.cursor = 'grabbing';
  });
  carousel.addEventListener('mouseleave', () => { isDown = false; carousel.style.cursor = 'grab'; });
  carousel.addEventListener('mouseup', () => { isDown = false; carousel.style.cursor = 'grab'; });
  carousel.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    carousel.scrollLeft = scrollLeft - ((e.pageX - carousel.offsetLeft) - startX) * 2;
  });
};

// ==================== REDUCED MOTION ====================
const applyReducedMotionPreferences = () => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.style.setProperty("--animation-duration", "0.01s");
  }
};

// ==================== LOADER ====================
const setupLoader = () => {
  const loader = document.getElementById('loader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('hidden');
      setTimeout(() => { loader.style.display = 'none'; }, 800);
    }, 3000);
  }
};

// ==================== SMOOTH SCROLL (LENIS) ====================
// Inertial scrolling like mont-fort.com. Lenis drives the native scroll position,
// so every scroll listener on the page keeps working unchanged.
const setupSmoothScroll = () => {
  if (typeof Lenis === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
  window.lenis = lenis;
  if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
};

const scrollToTarget = (target, offset = 0) => {
  if (window.lenis) window.lenis.scrollTo(target, { offset });
  else {
    const top = (typeof target === "number" ? target : target.getBoundingClientRect().top + window.scrollY) + offset;
    window.scrollTo({ top, behavior: "smooth" });
  }
};

// ==================== SECTION DEPTH (ZOOM INTO / OUT OF THE CLOUDS) ====================
// Like mont-fort.com: as you leave a section its content shrinks away and fades
// into the cloud sky behind it (sky.js thickens the clouds at the boundary), and
// the next section comes forward out of the clouds to full size. Uses the
// independent `scale` property and filter: opacity() so it never fights the
// transforms/opacity that other scripts already set on these elements.
const setupSectionDepth = () => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const small = window.matchMedia("(max-width: 768px)").matches;
  const depth = small ? 0.08 : 0.12;

  const stages = [
    { section: ".hero1", targets: [".hero1"], enter: false },
    { section: "#vision-reveal", targets: [".vision-container"] },
    { section: "#roadmap-section", targets: ["#roadmap-section > .container"] },
    // Pinned section: zoom away while still pinned, before it scrolls off.
    { section: ".ascent3d", targets: [".ascent3d-sticky"], exitShift: 1 },
    { section: ".globe3d", targets: [".globe3d-sticky"], exitShift: 1 },
    { section: ".stats-section", targets: [".stats-section > .container"], exit: false },
    { section: ".site-footer", targets: [".sf-inner"], exit: false },
  ].map(s => ({
    ...s,
    sectionEl: document.querySelector(s.section),
    els: s.targets.map(t => document.querySelector(t)).filter(Boolean),
  })).filter(s => s.sectionEl && s.els.length);

  const ease = t => t * t * (3 - 2 * t);
  const clamp = v => Math.min(1, Math.max(0, v));

  const render = () => {
    const vh = window.innerHeight;
    stages.forEach(stage => {
      const r = stage.sectionEl.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      // enter: section top travels from the bottom of the screen to 40% height
      const tIn = stage.enter === false ? 1 : ease(clamp((vh - r.top) / (vh * 0.6)));
      // exit: section bottom travels from 60% height to the top of the screen
      // (shifted down by exitShift screens for pinned sections)
      const shift = vh * (stage.exitShift || 0);
      const tOut = stage.exit === false ? 0 : ease(clamp((vh * 0.6 + shift - r.bottom) / (vh * 0.6)));
      const scale = (1 + depth * (1 - tIn)) * (1 - depth * tOut);
      const fade = Math.min(tIn, 1 - tOut);
      stage.els.forEach(el => {
        const er = el.getBoundingClientRect();
        el.style.transformOrigin = `50% ${(vh / 2 - er.top).toFixed(0)}px`;
        el.style.scale = scale.toFixed(4);
        el.style.filter = fade < 0.999 ? `opacity(${fade.toFixed(3)})` : "";
      });
    });
  };

  const onScroll = rafThrottle(render);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  render();
};

// ==================== SINGLE DOMContentLoaded ====================
document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.style.scrollBehavior = "smooth";
  applyReducedMotionPreferences();
  createScrollSlideAnimator();
  setupTextReveals();
  setupCardStacking();
  setupRoadmapStepHover();
  setupAboutTestimonialSlider();
  initializePanelCarousels();
  setupMobileNav();
  setupContactModal();
  setupPillarsCarousel();
  setupLoader();
  setupSmoothScroll();
  setupSectionDepth();

  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
