/* ==================== ОБЩИЕ ПЕРЕМЕННЫЕ ==================== */
const preloader     = document.getElementById('preloader');
const navbar        = document.getElementById('navbar');
const themeSwitch   = document.getElementById('theme-checkbox');
const navLinks      = document.getElementById('nav-links');
const overlay       = document.getElementById('menu-overlay');
const backToTopBtn  = document.getElementById('back-to-top');

let materialsData = [];  // будем заполнять динамически

/* ==================== ПРЕЛОАДЕР ==================== */
window.addEventListener('load', () => {
    preloader.classList.add('hide');
    setTimeout(() => preloader.remove(), 1500);
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
async function loadMaterials() {
    const res       = await fetch('/materials');
    const items     = await res.json();
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
                    <span>${new Date(m.date).toLocaleDateString('ru-RU', {
                        day: 'numeric', month: 'long', year: 'numeric'
                    })}</span>
                </div>
            </div>
        `;
        div.addEventListener('click', () => {
            window.location.href = `article.html?id=${m.id}`;
        });
        container.appendChild(div);
    });

    setupMaterialSearch();
}

function setupMaterialSearch() {
    const input = document.getElementById('materialSearch');
    const cards = document.querySelectorAll('.material-card');

    input.addEventListener('input', () => {
        const query = input.value.trim().toLowerCase();
        let found = false;

        cards.forEach(card => {
            const title = card.querySelector('.item-title')?.textContent.toLowerCase() || '';
            if (title.includes(query)) {
                card.style.display = '';
                found = true;
            } else {
                card.style.display = 'none';
            }
        });

        if (found) {
            const firstVisible = Array.from(cards).find(c => c.style.display !== 'none');
            firstVisible?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

/* ==================== ЗАГРУЗКА ГЛАВНОЙ СТРАНИЦЫ ==================== */
async function loadMain() {
    const res   = await fetch('/main');
    const items = await res.json();
    const cfg   = items[0];

    document.getElementById('heroSitename').textContent    = cfg.sitename;
    document.getElementById('heroSitename3').textContent   = cfg.sitename;
    document.getElementById('heroDesc').textContent        = cfg.description;
    document.getElementById('heroTitle').innerHTML         = cfg.slogan;

    // Формируем отображение названия с обёрткой <span>
    const rawName = cfg.sitename || '';
    let displayName;
    if (rawName.includes(' ')) {
        const parts = rawName.split(' ');
        const last  = parts.pop();
        displayName = `${parts.join(' ')} <span>${last}</span>`;
    } else {
        const match = rawName.match(/^(.+?)([A-Z].+)$/);
        displayName = match
            ? `${match[1]}<span>${match[2]}</span>`
            : `<span>${rawName}</span>`;
    }
    document.getElementById('heroSitename2').innerHTML = displayName;

    // Картинка
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
    setupBackToTop();

    Promise.all([
        loadGallery(),
        loadMaterials(),
        loadMain()
    ]).then(() => {
        // все данные загружены
    });

    window.addEventListener('scroll', () => {
        handleScrollAnimations();
        handleNavbarScroll();
    });
    handleScrollAnimations();
}

document.addEventListener('DOMContentLoaded', init);
