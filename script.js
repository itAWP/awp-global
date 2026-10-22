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
const createCounterAnimation = (element, target) => {
  let current = 0;
  const increment = target / 60;
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
          createCounterAnimation(numberEl, target);
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
        createCounterAnimation(numberEl, target);
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
      const rect = card.getBoundingClientRect();
      window.scrollTo({
        top: rect.top + window.scrollY - window.innerHeight * 0.1,
        behavior: "smooth"
      });
    };
    step.addEventListener("mouseenter", activate);
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

      if (stickyHeading) {
        stickyHeading.style.opacity = 1 - Math.min(1, clampedProgress * 2);
      }

      if (clampedProgress > 0 && clampedProgress <= 0.5) {
        scrollContainer.style.right = "0";
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
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const ctaButtons = document.querySelectorAll(".cta-button, .mobile-cta-button, .cloud-cta-button");
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

// ==================== CLOUD FLY-THROUGH BETWEEN SECTIONS ====================
// Scroll-linked: as a section boundary crosses the middle of the screen,
// cloud puffs grow out of the distance, cover the view, and stream past the
// edges, so moving to the next section feels like flying through a cloud.
const setupCloudTransitions = () => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // The hero already ends in a cloud bank, so the first fly-through is
  // into Services rather than the short About text right after the hero.
  const boundaries = [
    "#roadmap-section", "#tl-container",
    ".scroll-container-parent", ".stats-section"
  ].map(sel => document.querySelector(sel)).filter(Boolean);
  if (!boundaries.length) return;

  const layer = document.createElement("div");
  layer.className = "cloud-transition";
  layer.setAttribute("aria-hidden", "true");
  const veil = document.createElement("div");
  veil.className = "cloud-transition-veil";
  layer.appendChild(veil);

  // Each puff flies out from near the centre along its own direction.
  const puffs = [
    { img: 1, dx: -1.0, dy: -0.35, size: 0.9 },
    { img: 2, dx: 1.0, dy: -0.25, size: 1.0 },
    { img: 3, dx: -0.8, dy: 0.55, size: 1.1 },
    { img: 4, dx: 0.85, dy: 0.6, size: 1.0 },
    { img: 2, dx: 0.05, dy: -0.9, size: 0.8 },
    { img: 1, dx: -0.1, dy: 0.95, size: 1.2 },
    { img: 4, dx: -0.45, dy: 0.05, size: 0.7 },
    { img: 3, dx: 0.5, dy: -0.05, size: 0.75 }
  ].map(p => {
    const el = document.createElement("img");
    el.src = `./img/clouds/cloud-${p.img}.webp`;
    el.alt = "";
    el.decoding = "async";
    el.className = "cloud-puff";
    layer.appendChild(el);
    return { ...p, el };
  });
  document.body.appendChild(layer);

  let active = false;
  const sizePuffs = () => {
    const w = `${Math.max(window.innerWidth, window.innerHeight) * 0.55}px`;
    puffs.forEach(p => { p.el.style.width = w; });
  };
  sizePuffs();

  const render = () => {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const span = vh * 0.4;
    let t = -1;
    for (const el of boundaries) {
      const d = (el.getBoundingClientRect().top - vh / 2) / span;
      if (d > -1 && d < 1) { t = (1 - d) / 2; break; }
    }

    if (t < 0) {
      if (active) { layer.style.visibility = "hidden"; active = false; }
      return;
    }
    if (!active) { layer.style.visibility = "visible"; active = true; }

    const bell = Math.sin(Math.PI * t);
    veil.style.opacity = (0.9 * Math.pow(bell, 2.4)).toFixed(3);
    puffs.forEach(p => {
      const reach = 0.1 + Math.pow(t, 1.6) * 0.95;
      const x = p.dx * reach * vw * 0.6;
      const y = p.dy * reach * vh * 0.6;
      const scale = p.size * (0.35 + Math.pow(t, 1.4) * 2.6);
      p.el.style.opacity = Math.min(1, Math.pow(bell, 1.1) * 1.15).toFixed(3);
      p.el.style.transform =
        `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
    });
  };

  const onScroll = rafThrottle(render);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => { sizePuffs(); onScroll(); });
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
  setupCloudTransitions();

  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
