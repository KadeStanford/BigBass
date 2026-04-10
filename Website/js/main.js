/* ================================================
   Big Bass Tree Services — Main JavaScript
   ================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Navbar Scroll Effect ── */
  const navbar = document.querySelector('.navbar');
  const handleScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();


  /* ── Hero Background Slideshow ── */
  const slides = document.querySelectorAll('.hero-slide');
  if (slides.length > 1) {
    let current = 0;
    let paused = false;
    const pauseBtn = document.getElementById('slideshowPause');
    const intervalId = setInterval(() => {
      if (paused) return;
      slides[current].classList.remove('active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('active');
    }, 5000);

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        paused = !paused;
        pauseBtn.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
        pauseBtn.querySelector('.pause-icon').style.display = paused ? 'none' : '';
        pauseBtn.querySelector('.play-icon').style.display = paused ? '' : 'none';
      });
    }
  }


  /* ── Mobile Menu Toggle ── */
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.nav-menu');

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      menu.classList.toggle('open');
      document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
    });

    // Close menu when a link is clicked
    menu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('open');
        menu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }


  /* ── Smooth Scroll for Anchor Links ── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = navbar.offsetHeight + 16;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });


  /* ── Scroll Animations (Intersection Observer) ── */
  const animatedEls = document.querySelectorAll('[data-animate]');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = entry.target.dataset.delay || 0;
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    animatedEls.forEach(el => observer.observe(el));
  } else {
    // Fallback: show everything immediately
    animatedEls.forEach(el => el.classList.add('visible'));
  }


  /* ── Stats Counter Animation ── */
  const counters = document.querySelectorAll('[data-count]');

  if (counters.length) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(el => counterObserver.observe(el));
  }

  function animateCounter(el) {
    const target = parseInt(el.dataset.count, 10);
    const duration = 2000;
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quart
      const eased = 1 - Math.pow(1 - progress, 4);
      el.textContent = Math.round(target * eased);
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = target;
      }
    }

    requestAnimationFrame(update);
  }


  /* ── Contact Form Handling ── */
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', e => {
      e.preventDefault();

      const btn = contactForm.querySelector('button[type="submit"]');
      const origText = btn.innerHTML;
      btn.innerHTML = 'Sending...';
      btn.disabled = true;

      // Simulate sending — replace with real endpoint when ready
      setTimeout(() => {
        btn.innerHTML = '✓ Message Sent!';
        btn.style.background = 'var(--green-700)';
        contactForm.reset();

        setTimeout(() => {
          btn.innerHTML = origText;
          btn.style.background = '';
          btn.disabled = false;
        }, 3000);
      }, 1200);
    });

    // Phone formatting
    const phoneInput = contactForm.querySelector('input[type="tel"]');
    if (phoneInput) {
      phoneInput.addEventListener('input', () => {
        let digits = phoneInput.value.replace(/\D/g, '').slice(0, 10);
        if (digits.length > 6) {
          phoneInput.value = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
        } else if (digits.length > 3) {
          phoneInput.value = `(${digits.slice(0,3)}) ${digits.slice(3)}`;
        } else if (digits.length > 0) {
          phoneInput.value = `(${digits}`;
        }
      });
    }
  }


  /* ── Active Nav Link Highlight ── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link:not(.nav-cta)');

  function highlightNav() {
    const scrollY = window.scrollY + navbar.offsetHeight + 100;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollY >= top && scrollY < top + height) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + id) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', highlightNav, { passive: true });


  /* ── Back to Top Button ── */
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 600);
    }, { passive: true });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }


  /* ── Gallery Lightbox ── */
  const workImages = document.querySelectorAll('.ba-image img, .work-item img');
  if (workImages.length) {
    // Create lightbox
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
      <button class="lightbox-close" aria-label="Close">&times;</button>
      <button class="lightbox-prev" aria-label="Previous">&#10094;</button>
      <button class="lightbox-next" aria-label="Next">&#10095;</button>
      <img class="lightbox-img" src="" alt="">
    `;
    document.body.appendChild(lightbox);

    const lbImg = lightbox.querySelector('.lightbox-img');
    const lbClose = lightbox.querySelector('.lightbox-close');
    const lbPrev = lightbox.querySelector('.lightbox-prev');
    const lbNext = lightbox.querySelector('.lightbox-next');
    let currentLb = 0;
    const imgSrcs = Array.from(workImages).map(img => img.src);

    function openLightbox(index) {
      currentLb = index;
      lbImg.src = imgSrcs[currentLb];
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }

    workImages.forEach((img, i) => {
      const clickTarget = img.closest('.ba-image') || img.closest('.work-item');
      if (clickTarget) clickTarget.addEventListener('click', () => openLightbox(i));
    });

    lbClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
    lbPrev.addEventListener('click', e => { e.stopPropagation(); currentLb = (currentLb - 1 + imgSrcs.length) % imgSrcs.length; lbImg.src = imgSrcs[currentLb]; });
    lbNext.addEventListener('click', e => { e.stopPropagation(); currentLb = (currentLb + 1) % imgSrcs.length; lbImg.src = imgSrcs[currentLb]; });

    document.addEventListener('keydown', e => {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') { currentLb = (currentLb - 1 + imgSrcs.length) % imgSrcs.length; lbImg.src = imgSrcs[currentLb]; }
      if (e.key === 'ArrowRight') { currentLb = (currentLb + 1) % imgSrcs.length; lbImg.src = imgSrcs[currentLb]; }
    });
  }


  /* ── FAQ Accordion ── */
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isActive = item.classList.contains('active');

      // Close all other items
      document.querySelectorAll('.faq-item.active').forEach(open => {
        if (open !== item) {
          open.classList.remove('active');
          open.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle current item
      item.classList.toggle('active', !isActive);
      btn.setAttribute('aria-expanded', !isActive);
    });
  });


  /* ── Scroll Progress Bar ── */
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  document.body.prepend(progressBar);

  window.addEventListener('scroll', () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
    progressBar.style.width = progress + '%';
  }, { passive: true });


  /* ── Cookie Consent Banner ── */
  const cookieBanner = document.getElementById('cookieBanner');
  const cookieAccept = document.getElementById('cookieAccept');
  if (cookieBanner && cookieAccept && !localStorage.getItem('cookieConsent')) {
    cookieBanner.style.display = 'flex';
    cookieAccept.addEventListener('click', () => {
      localStorage.setItem('cookieConsent', '1');
      cookieBanner.style.display = 'none';
    });
  }

});
