/* ==================== ОБЩИЕ ПЕРЕМЕННЫЕ ==================== */
const preloader        = document.getElementById('preloader');
const navbar          = document.getElementById('navbar');
const themeSwitch     = document.getElementById('theme-checkbox');
const navLinks        = document.getElementById('nav-links');
const overlay         = document.getElementById('menu-overlay');
const backToTopBtn    = document.getElementById('back-to-top');
const modal           = document.getElementById('material-modal');
const modalTitle      = document.getElementById('modal-title');
const modalContent    = document.getElementById('modal-content');
const modalImg        = document.querySelector('.modal-img');
const modalDate       = document.querySelector('.modal-date');
const closeBtn        = document.querySelector('.close');
const prevBtn         = document.getElementById('prev-btn');
const nextBtn         = document.getElementById('next-btn');

let currentMaterialIndex = 0;
let materialsData      = [];  // будем заполнять динамически

/* ==================== ПРЕЛОАДЕР ==================== */
window.addEventListener('load', () => {
  preloader.classList.add('hide');
  setTimeout(() => preloader.remove(), 2500);
});

/* ==================== ПЛАВНАЯ ПРОКРУТКА ==================== */
function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        window.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
      }
    });
  });
}

/* ==================== АНИМАЦИИ ПРИ СКРОЛЛЕ ==================== */
function handleScrollAnimations() {
  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight / 1.3) {
      el.classList.add('animated');
    }
  });
}

function handleNavbarScroll() {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
}

/* ==================== ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ ==================== */
function setupThemeSwitcher() {
  const savedTheme   = localStorage.getItem('theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

  if (savedTheme === 'light' || (!savedTheme && prefersLight)) {
    document.documentElement.setAttribute('data-theme', 'light');
    themeSwitch.checked = true;
  }

  themeSwitch.addEventListener('change', function() {
    if (this.checked) {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
    }
  });
}

/* ==================== ГАЛЕРЕЯ ИЗОБРАЖЕНИЙ ==================== */
function setupGallery() {
  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const imgSrc = item.querySelector('img').src;
      const modalOverlay = document.createElement('div');
      modalOverlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.9); display: flex; align-items: center;
        justify-content: center; z-index: 2000; cursor: zoom-out;
      `;
      const img = document.createElement('img');
      img.src = imgSrc;
      img.style.cssText = `
        max-width: 90%; max-height: 90%; border-radius: 10px;
        box-shadow: 0 0 30px rgba(108,92,231,0.6);
      `;
      modalOverlay.appendChild(img);
      document.body.appendChild(modalOverlay);
      modalOverlay.addEventListener('click', () => modalOverlay.remove());
    });
  });
}

async function loadGallery() {
  const res   = await fetch('/gallery');
  const items = await res.json();
  const grid  = document.getElementById('galleryGrid');
  grid.innerHTML = '';

  // показываем новые первыми
  items.reverse().forEach(i => {
    const div = document.createElement('div');
    div.className = 'gallery-item animate-on-scroll';
    div.innerHTML = `
      <img src="/uploads/${i.filename}" alt="${i.title}">
      <div class="overlay"><i class="fas fa-search-plus fa-3x"></i></div>
    `;
    grid.appendChild(div);
  });

  setupGallery();
  handleScrollAnimations();
}

/* ==================== МОДАЛЬНОЕ ОКНО МАТЕРИАЛОВ ==================== */
function initMaterialsModal() {
  document.querySelectorAll('.material-card').forEach((card, idx) => {
    materialsData.push({
      title:   card.querySelector('h3').textContent,
      content: card.querySelector('p').textContent,
      date:    card.querySelector('.date').textContent,
      imgSrc:  card.querySelector('.card-img img').src
    });
    card.addEventListener('click', () => {
      currentMaterialIndex = idx;
      openMaterialModal(currentMaterialIndex);
    });
  });

  prevBtn.addEventListener('click', () => navigateMaterial(-1));
  nextBtn.addEventListener('click', () => navigateMaterial(1));
  closeBtn.addEventListener('click', closeMaterialModal);
  window.addEventListener('click', e => { if (e.target === modal) closeMaterialModal(); });
}

function openMaterialModal(index) {
  const m = materialsData[index];
  modalTitle.textContent   = m.title;
  modalContent.innerHTML   = m.content;
  modalDate.textContent    = m.date;
  modalImg.innerHTML       = `<img src="${m.imgSrc}" alt="${m.title}">`;
  modal.style.display      = 'block';
  document.body.style.overflow = 'hidden';
}

function closeMaterialModal() {
  modal.style.display      = 'none';
  document.body.style.overflow = '';
}

function navigateMaterial(direction) {
  currentMaterialIndex = (currentMaterialIndex + direction + materialsData.length) % materialsData.length;
  openMaterialModal(currentMaterialIndex);
}

/* ==================== ПЕРЕКЛЮЧЕНИЕ РАЗДЕЛОВ ==================== */
function setupAdminSections() {
  const links    = document.querySelectorAll('.admin-nav-link');
  const sections = document.querySelectorAll('.admin-section');

  links.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = link.dataset.section;
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      sections.forEach(s => s.classList.remove('active'));
      document.getElementById(target).classList.add('active');
    });
  });
}

/* ==================== КНОПКА "НАВЕРХ" ==================== */
function setupBackToTop() {
  window.addEventListener('scroll', () => {
    backToTopBtn.classList.toggle('visible', window.pageYOffset > 300);
  });
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ==================== ЗАГРУЗКА МАТЕРИАЛОВ ==================== */
// Загружаем материалы и рендерим карточки
async function loadMaterials() {
  const res = await fetch('/materials');
  const items = await res.json();
  const container = document.getElementById('materialsContainer');
  container.innerHTML = '';

  items.forEach(m => {
    const div = document.createElement('div');
    div.className = 'material-card animate-on-scroll';
    div.innerHTML = `
      <div class="card-img">
        <img src="/uploads/${m.image}" alt="${m.title}">
      </div>
      <div class="card-content">
        <h3 class="item-title">${m.title}</h3>
        <p>${m.content}</p>
        <div class="date">
          <i class="far fa-calendar"></i>
          <span>${new Date(m.date).toLocaleDateString()}</span>
        </div>
      </div>
    `;
    container.appendChild(div);
  });

  setupMaterialSearch();
  initMaterialsModal()   // <-- после рендера привязываем фильтр
}

// Функция фильтрации по названию
function setupMaterialSearch() {
  const input = document.getElementById('materialSearch');
  const cards = document.querySelectorAll('.material-card');

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();

    let found = false;

    cards.forEach(card => {
      const titleEl = card.querySelector('.item-title');
      const title = titleEl ? titleEl.textContent.toLowerCase() : '';

      if (title.includes(query)) {
        card.style.display = '';
        found = true;
      } else {
        card.style.display = 'none';
      }
    });

    // Если найден хотя бы один результат, сделать плавный скролл к первой подходящей карточке
    if (found) {
      const firstVisibleCard = Array.from(cards).find(card => card.style.display !== 'none');
      if (firstVisibleCard) {
        firstVisibleCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });
}


// Инициализируем загрузку при старте
window.addEventListener('DOMContentLoaded', loadMaterials);


/* ==================== ЗАГРУЗКА ГЛАВНОЙ СТРАНИЦЫ ==================== */
async function loadMain() {
  const res    = await fetch('/main');
  const items  = await res.json();
  const cfg    = items[0];
  
  // название
  document.getElementById('heroSitename').textContent = cfg.sitename;

  // название
  const rawName = cfg.sitename || ''; 
  let displayName;

  // 1) если есть пробелы, оборачиваем последнее слово
  if (rawName.includes(' ')) {
    const parts = rawName.split(' ');
    const last  = parts.pop();
    const prefix = parts.join(' ');
    displayName = `${prefix} <span>${last}</span>`;
  } else {
    // 2) иначе ищем границу строчная→заглавная
    const match = rawName.match(/^(.+?)([A-Z].+)$/);
    if (match) {
      displayName = `${match[1]}<span>${match[2]}</span>`;
    } else {
      // если не нашли границу — просто оборачиваем всё
      displayName = `<span>${rawName}</span>`;
    }
  }

  // и вставляем в элемент через innerHTML
  document.getElementById('heroSitename2').innerHTML = displayName;


  // footer
  document.getElementById('heroSitename3').textContent = cfg.sitename;

  // текст
  document.getElementById('heroDesc').textContent = cfg.description;
  
  // заголовок: оборачиваем последн. слово в <span>
  document.getElementById('heroTitle').innerHTML = cfg.slogan;
  
  // картинка
  const container = document.getElementById('homeImage');
  container.innerHTML = '';
  if (cfg.image) {
    const img = document.createElement('img');
    img.src = cfg.image;
    img.alt = 'Hero';
    container.appendChild(img);
  }
}

/* ==================== ИНИЦИАЛИЗАЦИЯ ==================== */
function init() {
  setupSmoothScroll();
  setupThemeSwitcher();
  setupAdminSections();
  setupBackToTop();

  Promise.all([
    loadGallery(),
    loadMaterials(),
    loadMain()
  ]).then(() => {
    initMaterialsModal();
  });

  window.addEventListener('scroll', () => {
    handleScrollAnimations();
    handleNavbarScroll();
  });
  handleScrollAnimations();
}

document.addEventListener('DOMContentLoaded', loadMain);
init();