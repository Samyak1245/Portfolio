/**
 * SAMYAK PUSATE — MAIN JAVASCRIPT ENGINE
 * Clean, lightweight, professional animations:
 * - Starfield Canvas with subtle depth & shooting stars
 * - Realistic Astronaut EVA companion traveling down viewport on scroll
 * - Interactive Web Audio Piano Synthesizer
 * - Form handling & Copy Email toast feedback
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. STARFIELD CANVAS ENGINE
  // ==========================================================================
  const canvas = document.getElementById('space-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const STAR_COUNT = Math.min(Math.floor((width * height) / 4500), 320);
  const stars = [];
  const meteors = [];

  // Mouse for soft camera drift
  let mouseX = width / 2;
  let mouseY = height / 2;
  let targetMouseX = mouseX;
  let targetMouseY = mouseY;

  window.addEventListener('mousemove', (e) => {
    targetMouseX = e.clientX;
    targetMouseY = e.clientY;
  }, { passive: true });

  function initStars() {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.3 + 0.3,
        alpha: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
        depth: Math.random() * 0.6 + 0.4
      });
    }
  }

  function spawnMeteor() {
    if (Math.random() < 0.015 && meteors.length < 2) {
      meteors.push({
        x: Math.random() * width * 0.8,
        y: Math.random() * height * 0.3,
        len: Math.random() * 90 + 50,
        speed: Math.random() * 10 + 8,
        life: 0,
        maxLife: 35
      });
    }
  }

  function renderSpace() {
    ctx.clearRect(0, 0, width, height);

    mouseX += (targetMouseX - mouseX) * 0.04;
    mouseY += (targetMouseY - mouseY) * 0.04;

    const offsetX = (mouseX - width / 2) * 0.025;
    const offsetY = (mouseY - height / 2) * 0.025;

    // Draw Realistic Stars
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.twinklePhase += s.twinkleSpeed;
      const currentAlpha = s.alpha * (0.65 + 0.35 * Math.sin(s.twinklePhase));

      const px = s.x - offsetX * s.depth;
      const py = s.y - offsetY * s.depth;

      ctx.save();
      ctx.globalAlpha = currentAlpha;
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.arc(px, py, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Meteors
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.life++;
      m.x += m.speed;
      m.y += m.speed * 0.65;
      const opacity = 1 - m.life / m.maxLife;

      if (opacity <= 0) {
        meteors.splice(i, 1);
        continue;
      }

      ctx.save();
      const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.len, m.y - m.len * 0.65);
      grad.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
      grad.addColorStop(0.3, `rgba(56, 189, 248, ${opacity * 0.6})`);
      grad.addColorStop(1, 'transparent');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.len, m.y - m.len * 0.65);
      ctx.stroke();
      ctx.restore();
    }

    spawnMeteor();
    requestAnimationFrame(renderSpace);
  }

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initStars();
  });

  initStars();
  renderSpace();

  // ==========================================================================
  // 2. REALISTIC ASTRONAUT SCROLL MOTION & PLANET PARALLAX
  // ==========================================================================
  const astronaut = document.getElementById('astronaut-vessel');
  const planets = document.querySelectorAll('.realistic-planet');

  function onScroll() {
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0;

    // Smooth vertical astronaut descent along right flank
    if (astronaut) {
      const travelHeight = window.innerHeight - 150;
      const targetY = progress * travelHeight;
      const swayX = Math.sin(progress * Math.PI * 3) * 16;
      astronaut.style.transform = `translate3d(${swayX}px, ${targetY}px, 0)`;
    }

    // Planetary subtle parallax
    planets.forEach((p) => {
      const speed = parseFloat(p.dataset.speed) || 0.08;
      p.style.transform = `translate3d(0, ${-scrollY * speed}px, 0)`;
    });

    // Navbar Scrolled Effect
    const navbar = document.getElementById('navbar');
    if (navbar) {
      if (scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Astronaut Click Easter Egg
  if (astronaut) {
    astronaut.addEventListener('click', () => {
      playPianoFrequency(523.25, 0.3); // C5 soft chime
      astronaut.style.transition = 'transform 0.5s ease';
      astronaut.style.transform += ' scale(1.15) rotate(12deg)';
      setTimeout(() => {
        astronaut.style.transition = '';
      }, 500);
      showToast('Astronaut: Thrusters at 100%!');
    });
  }

  // ==========================================================================
  // 3. INTERACTIVE PIANO SYNTHESIZER (WEB AUDIO API)
  // ==========================================================================
  let audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  const noteFreqs = {
    'C4': 261.63,
    'D4': 293.66,
    'E4': 329.63,
    'F4': 349.23,
    'G4': 392.00,
    'A4': 440.00,
    'B4': 493.88,
    'C5': 523.25
  };

  const keyBinds = {
    'a': 'C4',
    's': 'D4',
    'd': 'E4',
    'f': 'F4',
    'g': 'G4',
    'h': 'A4',
    'j': 'B4',
    'k': 'C5'
  };

  function playPianoFrequency(freq, duration = 0.8) {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Warm acoustic/electronic piano tone
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, ctx.currentTime);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.03); // Quick attack
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration); // Natural decay

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn('Audio pending gesture', e);
    }
  }

  // Bind clickable piano keys
  const pianoKeys = document.querySelectorAll('.piano-key');
  pianoKeys.forEach((key) => {
    const note = key.dataset.note;
    function play() {
      if (note && noteFreqs[note]) {
        playPianoFrequency(noteFreqs[note], 0.85);
        key.classList.add('active');
        setTimeout(() => key.classList.remove('active'), 180);
      }
    }
    key.addEventListener('mousedown', play);
    key.addEventListener('touchstart', (e) => {
      e.preventDefault();
      play();
    }, { passive: false });
  });

  // Keyboard keys listener
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    const key = e.key.toLowerCase();
    if (keyBinds[key]) {
      const note = keyBinds[key];
      const keyEl = document.querySelector(`.piano-key[data-note="${note}"]`);
      if (keyEl) {
        playPianoFrequency(noteFreqs[note], 0.85);
        keyEl.classList.add('active');
        setTimeout(() => keyEl.classList.remove('active'), 180);
      }
    }
  });

  // ==========================================================================
  // 4. TOAST NOTIFICATION UTILITY
  // ==========================================================================
  const toast = document.getElementById('toast');
  let toastTimeout = null;

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // 1-Click Copy Email
  const copyEmailRow = document.getElementById('copy-email-btn');
  if (copyEmailRow) {
    copyEmailRow.addEventListener('click', () => {
      const email = 'samyak.pusate.work@gmail.com';
      navigator.clipboard.writeText(email).then(() => {
        showToast('✓ Email copied: ' + email);
      }).catch(() => {
        showToast(email);
      });
    });
  }

  // Contact Form Submission
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const oldText = btn.innerHTML;
      btn.innerHTML = 'Sending message...';
      btn.disabled = true;

      setTimeout(() => {
        showToast('✓ Message sent successfully! Thank you.');
        btn.innerHTML = 'Message Sent ✓';
        form.reset();
        setTimeout(() => {
          btn.innerHTML = oldText;
          btn.disabled = false;
        }, 3000);
      }, 1000);
    });
  }

  // Mobile Menu Toggle
  const mobileBtn = document.getElementById('mobile-btn');
  const navLinks = document.getElementById('nav-links');
  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  // Smooth internal link scrolling
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

})();
