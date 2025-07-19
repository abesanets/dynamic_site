// ——————————————————————
// Форматирование даты dd.mm.yyyy
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year  = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// ——————————————————————
// Универсальный загрузчик файлов
function setupFileUpload({ uploadEl, inputEl, textEl, btnEl }) {
  btnEl.addEventListener('click', () => inputEl.click());
  inputEl.addEventListener('change', () => {
    if (inputEl.files.length) {
      textEl.textContent = inputEl.files[0].name;
      uploadEl.classList.add('has-file');
    }
  });
  ['dragenter','dragover'].forEach(evt =>
    uploadEl.addEventListener(evt, e => {
      e.preventDefault();
      uploadEl.classList.add('drag-over');
    })
  );
  ['dragleave','drop'].forEach(evt =>
    uploadEl.addEventListener(evt, e => {
      e.preventDefault();
      uploadEl.classList.remove('drag-over');
    })
  );
  uploadEl.addEventListener('drop', e => {
    if (!e.dataTransfer.files.length) return;
    inputEl.files = e.dataTransfer.files;
    textEl.textContent = e.dataTransfer.files[0].name;
    uploadEl.classList.add('has-file');
  });
  uploadEl.addEventListener('click', e => {
    if (e.target === uploadEl || e.target === textEl || e.target.tagName === 'I') {
      inputEl.click();
    }
  });
}

// ——————————————————————
// Загрузка и заполнение настроек (описание, слоган, текущее изображение)
async function loadSettings() {
  const res   = await fetch('/main');
  const items = await res.json();
  const cfg   = items[0] || {};

  // Текстовые поля
  document.getElementById('sitename').value = cfg.sitename || '';
  document.getElementById('description').value = cfg.description || '';
  document.getElementById('slogan').value      = cfg.slogan || '';

  // Текущее изображение
  const currInput = document.getElementById('currentImage');
  const txt       = document.getElementById('homeUploadText');
  currInput.value = cfg.image || '';
  if (cfg.image) {
    txt.textContent = cfg.image.split('/').pop();
  }
}

// ——————————————————————
// Загрузка и рендер галереи
async function loadAdminGallery() {
  const res   = await fetch('/gallery');
  const items = await res.json();
  const tbody = document.getElementById('galleryTable');
  tbody.innerHTML = '';

  items.reverse().forEach(i => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="/uploads/${i.filename}" class="table-img"></td>
      <td>${i.title}</td>
      <td>${formatDate(i.date)}</td>
      <td class="table-actions">
        <button class="table-btn delete" data-filename="${i.filename}">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.table-btn.delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Удалить это изображение?')) return;
      await fetch('/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: btn.dataset.filename })
      });
      loadAdminGallery();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settingsForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // предотвращает переход по умолчанию

    const formData = new FormData(form);

    try {
      const response = await fetch('/admin/save-settings', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Ошибка при отправке данных');

      const result = await response.json();
      console.log('Ответ сервера:', result);

      // можно здесь отобразить сообщение об успехе
      alert('Настройки успешно сохранены!');
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Произошла ошибка при сохранении настроек.');
    }
  });

  // обработчик для кнопки выбора файла
  const homeFileBtn = document.getElementById('homeFileBtn');
  const homeImageInput = document.getElementById('homeImage');

  homeFileBtn.addEventListener('click', () => {
    homeImageInput.click();
  });

  homeImageInput.addEventListener('change', () => {
    const uploadText = document.getElementById('homeUploadText');
    const file = homeImageInput.files[0];
    if (file) {
      uploadText.textContent = `Выбран файл: ${file.name}`;
    } else {
      uploadText.textContent = 'Перетащите изображение или нажмите';
    }
  });
});

const form = document.getElementById('settingsForm');

// ——————————————————————
// Загрузка и рендер материалов
async function loadAdminMaterials() {
  const res   = await fetch('/materials');
  const items = await res.json();
  const tbody = document.getElementById('materialsTable');
  tbody.innerHTML = '';

  items.forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m.title}</td>
      <td>${formatDate(m.date)}</td>
      <td>
        <span style="color:${m.status==='published'? '#4cd137':'#fbc531'}">
          ${m.status==='published'? 'Опубликовано' : 'Черновик'}
        </span>
      </td>
      <td class="table-actions">
        <button class="table-btn delete" data-id="${m.id}" data-image="${m.image}">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.table-btn.delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Удалить материал?')) return;
      await fetch('/materials/delete', {
        method: 'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ id: btn.dataset.id, image: btn.dataset.image })
      });
      loadAdminMaterials();
    });
  });
}

// ——————————————————————
// Смена пароля
document.getElementById('changePassForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const oldPass = document.getElementById('oldPass').value;
  const newPass = document.getElementById('newPass').value;
  const passKey = document.getElementById('passKey').value;
  const res     = await fetch('/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPass, newPass, passKey })
  });
  const json = await res.json();
  alert(json.message);
});

// ——————————————————————
// Загрузка/отправка форм (галерея и материалы)
document.getElementById('uploadForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const data   = new FormData(e.target);
  const res    = await fetch('/upload', { method: 'POST', body: data });
  const result = await res.json();
  if (result.success) {
    e.target.reset();
    document.getElementById('uploadText').textContent = 'Перетащите изображение или нажмите';
    loadAdminGallery();
    alert('Изображение загружено');
  } else {
    alert('Ошибка при загрузке');
  }
});
document.getElementById('materialForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const data   = new FormData(e.target);
  const res    = await fetch('/materials', { method:'POST', body: data });
  const result = await res.json();
  if (result.success) {
    e.target.reset();
    document.getElementById('matUploadText').textContent = 'Перетащите изображение или нажмите';
    loadAdminMaterials();
    alert('Материал создан');
  } else {
    alert('Ошибка создания');
  }
});

// ——————————————————————
// Счётчики
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
Promise.all([
  fetch('/gallery').then(r => r.json()),
  fetch('/materials').then(r => r.json())
]).then(([gallery, materials]) => {
  document.getElementById('count-gallery').textContent   = gallery.length;
  document.getElementById('count-materials').textContent = materials.length;
  document.getElementById('count-visitors').textContent  = rand(1000, 10000).toLocaleString();
}).catch(console.error);

// ——————————————————————
// Навигация и простые анимации
document.querySelectorAll('.admin-nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    link.classList.add('active');
    document.getElementById(link.dataset.section).classList.add('active');
  });
});
document.querySelectorAll('.stat-card, .form-btn').forEach(el => {
  el.addEventListener('mouseenter', () => el.style.transform = 'translateY(-5px)');
  el.addEventListener('mouseleave', () => el.style.transform = 'translateY(0)');
});

// ——————————————————————
// Выход
document.querySelector('.admin-logout')?.addEventListener('click', () => {
  if (confirm('Вы действительно хотите выйти из админ‑панели?')) {
    window.location.href = 'index.html';
  }
});

// ——————————————————————
// Инициализация при загрузке DOM
window.addEventListener('DOMContentLoaded', () => {
  // Файловые аплоадеры
  setupFileUpload({
    uploadEl: document.getElementById('fileUpload'),
    inputEl:  document.getElementById('imgFile'),
    textEl:   document.getElementById('uploadText'),
    btnEl:    document.getElementById('fileBtn'),
  });
  setupFileUpload({
    uploadEl: document.getElementById('matFileUpload'),
    inputEl:  document.getElementById('matImage'),
    textEl:   document.getElementById('matUploadText'),
    btnEl:    document.getElementById('matFileBtn'),
  });
  setupFileUpload({
    uploadEl: document.getElementById('homeFileUpload'),
    inputEl:  document.getElementById('homeImage'),
    textEl:   document.getElementById('homeUploadText'),
    btnEl:    document.getElementById('homeFileBtn'),
  });

  // Данные
  loadSettings();
  loadAdminGallery();
  loadAdminMaterials();
});
