import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import './style.css';
import { createScene } from './scene.js';
import { stages } from './stages.js';
import { projects } from './data/projects.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Persian digits for everything user-facing
const fa = (v) => String(v).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
const pad = (n) => fa(String(n).padStart(2, '0'));

// ---- Story panels + progress rail -------------------------------------------
const panels = document.getElementById('panels');
const rail = document.getElementById('rail');
stages.forEach((s, i) => {
  const n = pad(i + 1);
  panels.insertAdjacentHTML('beforeend', `
    <article class="panel" data-i="${i}">
      <p class="eyebrow">${n} — ${s.label}</p>
      <h2>${s.title}</h2>
      <p>${s.body}</p>
    </article>`);
  rail.insertAdjacentHTML('beforeend', `<li><button data-i="${i}"><span>${n}</span>${s.label}</button></li>`);
});

// ---- Projects grid ------------------------------------------------------------
const grid = document.getElementById('grid');
projects.forEach((p, i) => {
  grid.insertAdjacentHTML('beforeend', `
    <a class="card reveal" href="#${p.slug}" style="--h:${p.hue}">
      <div class="thumb"><span class="ph">${p.type}</span></div>
      <div class="meta">
        <span class="num">${pad(i + 1)}</span>
        <h3>${p.title}</h3>
        <span>${p.location}، ${fa(p.year)}</span>
        <span class="status">${p.status}</span>
      </div>
    </a>`);
});

// ---- Scene + scroll -----------------------------------------------------------
const story = document.querySelector('.story');
const hero = document.querySelector('.hero');
const titleblock = document.getElementById('titleblock');
const tbDwg = document.getElementById('tb-dwg');
const tbStage = document.getElementById('tb-stage');
const scene = createScene(document.getElementById('scene'));

let active = -1;
function storyProgress() {
  const r = story.getBoundingClientRect();
  const total = r.height - window.innerHeight;
  return Math.min(1, Math.max(0, -r.top / total));
}

function onScroll() {
  const p = storyProgress();
  scene.setProgress(p);
  document.body.classList.toggle('dark', ['plan', 'section', 'built'].includes(stages[Math.round(p * (stages.length - 1))].id));
  hero.style.opacity = String(Math.max(0, 1 - p * 12));
  hero.style.transform = `translateY(${-p * 300}px)`;
  titleblock.style.opacity = p > 0.04 ? '1' : '0';

  const i = Math.round(p * (stages.length - 1));
  if (i !== active) {
    active = i;
    panels.querySelectorAll('.panel').forEach((el) => el.classList.toggle('on', +el.dataset.i === i && p > 0.04));
    rail.querySelectorAll('button').forEach((el) => el.classList.toggle('on', +el.dataset.i === i));
    tbDwg.textContent = stages[i].dwg;
    tbStage.textContent = `${pad(i + 1)} ${stages[i].label}`;
  }
  // Only show the first panel once the hero has scrolled away
  if (i === 0) panels.querySelector('.panel').classList.toggle('on', p > 0.04);

  // Pause WebGL when the story is off-screen
  scene.setRunning(story.getBoundingClientRect().bottom > 0);
}

let lenis;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.09 });
  lenis.on('scroll', onScroll);
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
} else {
  window.addEventListener('scroll', onScroll, { passive: true });
}
onScroll();

function scrollToY(y) {
  if (lenis) lenis.scrollTo(y, { duration: 1.6 });
  else window.scrollTo({ top: y });
}

rail.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const total = story.offsetHeight - window.innerHeight;
  scrollToY(story.offsetTop + (total * +b.dataset.i) / (stages.length - 1));
});
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const t = document.querySelector(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    scrollToY(t.offsetTop);
  });
});

// ---- Reveal on enter ------------------------------------------------------------
const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
