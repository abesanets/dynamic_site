const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');
const multer = require('multer');
const compression = require('compression');

const app = express();
const PORT = 3000;

/* ==================== КОНФИГУРАЦИЯ ПУТЕЙ ==================== */
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
const UPLOAD_DIR2 = path.join(__dirname, 'uploads2');
const GALLERY_JSON = path.join(__dirname, 'data', 'gallery.json');
const MATERIALS_JSON = path.join(__dirname, 'data', 'materials.json');
const CONFIG_PATH = path.join(__dirname, 'config.json');
const CONFIRMATION_KEY = '791f136fdc926e810edd1b6643a9f3cb3029c9af726fbeed657a7fc9714168db';

/* ==================== КЭШ В ПАМЯТИ ==================== */
let cache = {
  gallery: null,
  materials: null,
  config: null
};

async function warmupCache() {
  try {
    const [galleryRaw, materialsRaw, configRaw] = await Promise.all([
      fsPromises.readFile(GALLERY_JSON, 'utf8').catch(() => '[]'),
      fsPromises.readFile(MATERIALS_JSON, 'utf8').catch(() => '[]'),
      fsPromises.readFile(CONFIG_PATH, 'utf8').catch(() => JSON.stringify({
        sitename: '',
        description: '',
        slogan: '',
        image: '',
        password: 'admin123'
      }))
    ]);
    cache.gallery = JSON.parse(galleryRaw);
    cache.materials = JSON.parse(materialsRaw);
    cache.config = JSON.parse(configRaw);
  } catch (e) {
    console.error('Ошибка warmupCache:', e);
    if (!cache.gallery) cache.gallery = [];
    if (!cache.materials) cache.materials = [];
    if (!cache.config) cache.config = { sitename: '', description: '', slogan: '', image: '', password: 'admin123' };
  }
}

function getConfig() {
  if (!cache.config) cache.config = readConfig();
  return cache.config;
}

function setConfig(nextCfg) {
  cache.config = nextCfg;
  return fsPromises.writeFile(CONFIG_PATH, JSON.stringify(nextCfg, null, 2), 'utf8');
}

/* ==================== НАСТРОЙКА MULTER ==================== */
const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
});

const mainStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR2),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const uploadGallery = multer({ storage: galleryStorage });
const uploadMaterial = multer({ storage: galleryStorage });
const uploadMain = multer({ storage: mainStorage });

/* ==================== СЕРВЕРНАЯ КОНФИГУРАЦИЯ ==================== */
function readConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  }
  // дефолтный объект
  return {
    sitename: '',
    description: '',
    slogan: '',
    image: '',
    password: 'admin123'
  };
}

function writeConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

// Считываем конфиг, включая пароль
const initialConfig = readConfig();
let CORRECT_PASSWORD = initialConfig.password || 'admin123';


// Создаем необходимые директории
[UPLOAD_DIR, UPLOAD_DIR2].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==================== */
function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}


/* ==================== MIDDLEWARE ==================== */
app.disable('x-powered-by');
app.set('etag', 'strong');
app.use(compression());

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(session({
  secret: 'YOUR_SECRET_KEY',
  resave: false,
  saveUninitialized: true
}));

// Защита админки
app.use((req, res, next) => {
  if (req.path === '/admin.html' && !req.session.auth) {
    return res.redirect('/login.html');
  }
  next();
});

// Статические файлы
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d', etag: true, lastModified: true }));
app.use('/uploads2', express.static(UPLOAD_DIR2, { maxAge: '1d', etag: true, lastModified: true }));

/* ==================== АУТЕНТИФИКАЦИЯ ==================== */
app.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === CORRECT_PASSWORD) {
    req.session.auth = true;
    return res.json({ success: true, message: 'Авторизация прошла успешно' });
  }
  setTimeout(() => {
    res.json({ success: false, message: 'Неверный пароль. Попробуйте ещё раз.' });
  }, 1500);
});

app.post('/change-password', async (req, res) => {
  const { oldPass, newPass, passKey } = req.body;
  if (!req.session.auth) {
    return res.status(401).json({ success: false, message: 'Не авторизованы' });
  }
  if (passKey !== CONFIRMATION_KEY) {
    return res.status(403).json({ success: false, message: 'Неверный ключ подтверждения' });
  }
  if (oldPass !== CORRECT_PASSWORD) {
    return res.status(400).json({ success: false, message: 'Текущий пароль введён неверно' });
  }

  // обновляем переменную
  CORRECT_PASSWORD = newPass;

  // перезаписываем в config.json + кэш
  const cfg = getConfig();
  cfg.password = newPass;
  await setConfig(cfg);

  return res.json({ success: true, message: 'Пароль успешно изменён!' });
});


app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Session destroy error:', err);
    res.redirect('/login.html');
  });
});

/* ==================== ГАЛЕРЕЯ ==================== */
app.get('/gallery', (req, res) => {
  if (!cache.gallery) {
    cache.gallery = readJSON(GALLERY_JSON);
  }
  res.json(cache.gallery);
});

app.post('/upload', uploadGallery.single('image'), async (req, res) => {
  if (!cache.gallery) cache.gallery = readJSON(GALLERY_JSON);
  cache.gallery.push({
    filename: req.file.filename,
    title: req.body.title || '',
    date: new Date().toISOString()
  });
  await fsPromises.writeFile(GALLERY_JSON, JSON.stringify(cache.gallery, null, 2), 'utf8');
  res.json({ success: true });
});

app.post('/delete', async (req, res) => {
  if (!cache.gallery) cache.gallery = readJSON(GALLERY_JSON);
  cache.gallery = cache.gallery.filter(i => i.filename !== req.body.filename);
  await fsPromises.writeFile(GALLERY_JSON, JSON.stringify(cache.gallery, null, 2), 'utf8');
  fs.unlink(path.join(UPLOAD_DIR, req.body.filename), () => res.json({ success: true }));
});

/* ==================== МАТЕРИАЛЫ ==================== */
app.get('/materials', (req, res) => {
  if (!cache.materials) cache.materials = readJSON(MATERIALS_JSON);
  const materials = [...cache.materials].sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(materials);
});

app.post('/materials', uploadMaterial.single('image'), async (req, res) => {
  if (!cache.materials) cache.materials = readJSON(MATERIALS_JSON);
  cache.materials.push({
    id: Date.now(),
    title: req.body.title || '',
    content: req.body.content || '',
    image: req.file ? req.file.filename : '',
    date: new Date().toISOString(),
    status: 'published'
  });
  await fsPromises.writeFile(MATERIALS_JSON, JSON.stringify(cache.materials, null, 2), 'utf8');
  res.json({ success: true });
});

app.post('/materials/delete', async (req, res) => {
  if (!cache.materials) cache.materials = readJSON(MATERIALS_JSON);
  cache.materials = cache.materials.filter(m => m.id != req.body.id);
  await fsPromises.writeFile(MATERIALS_JSON, JSON.stringify(cache.materials, null, 2), 'utf8');
  if (req.body.image) fs.unlink(path.join(UPLOAD_DIR, req.body.image), () => {});
  res.json({ success: true });
});

/* ==================== ГЛАВНАЯ СТРАНИЦА ==================== */
app.get('/main', (req, res) => {
  const cfg = getConfig();
  res.json([cfg]);
});

app.post('/main', uploadMain.single('image'), async (req, res) => {
  const { sitename, description, slogan, currentImage } = req.body;
  const cfg = {
    sitename,
    description,
    slogan,
    image: req.file ? '/uploads2/' + req.file.filename : currentImage
  };
  await setConfig(cfg);
  res.json({ message: 'Настройки сохранены' });
});

app.post('/admin/save-settings', uploadMain.single('image'), async (req, res) => {
  try {
    const { sitename, description, slogan, currentImage } = req.body;
    const uploadedImage = req.file;
    const config = {
      sitename,
      description,
      slogan,
      image: uploadedImage ? '/uploads2/' + uploadedImage.filename : currentImage
    };
    await setConfig(config);
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка на сервере:', err);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});




async function cleanupUploadsDir() {
  try {
    // создаём папку, если нет
    await fsPromises.mkdir(UPLOAD_DIR2, { recursive: true });

    // читаем её содержимое
    const files = await fsPromises.readdir(UPLOAD_DIR2);
    if (files.length <= 1) return; // нечего чистить

    // получаем информацию о каждом файле
    const stats = await Promise.all(files.map(async file => {
      const filepath = path.join(UPLOAD_DIR2, file);
      const stat     = await fsPromises.stat(filepath);
      return { file, mtime: stat.mtime };
    }));

    // сортируем по времени модификации, старые — в начало
    stats.sort((a, b) => a.mtime - b.mtime);

    // удаляем все, кроме самого нового (последнего в массиве)
    const toDelete = stats.slice(0, stats.length - 1);
    await Promise.all(toDelete.map(({ file }) =>
      fsPromises.unlink(path.join(UPLOAD_DIR2, file))
    ));

    console.log(`🧹 Удалено ${toDelete.length} старых файла(ов), оставлен: ${stats[stats.length - 1].file}`);
  } catch (err) {
    console.error('Ошибка при очистке uploads2:', err);
  }
}



require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');


// Настройка Telegram
const BOT_TOKEN = process.env.BOT_TOKEN || '8090008947:AAGoI1DrVdHEhawbvQzbmcKu0tx30Ky14BU';
const GROUP_ID  = process.env.GROUP_ID  || '-1002564808736';
const bot = new TelegramBot(BOT_TOKEN);



// Маршрут для формы заявки
app.post('/request', async (req, res) => {
  const { phone, email, message } = req.body;
  if (!phone || !email || !message) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }
  // Формируем текст для Telegram
  const msg = 
    `📨 *Новая заявка!*\n\n` +
    `📞 Телефон: ${phone}\n` +
    `✉️ Email: ${email}\n\n` +
    `💬 ${message}`;
  await bot.sendMessage(GROUP_ID, msg, { parse_mode: 'Markdown' });
  res.json({ success: true });
});





/* ==================== ЗАПУСК СЕРВЕРА ==================== */
if (require.main === module) {
  app.listen(PORT, () => console.log(`Сервер работает на http://localhost:${PORT} 🔥`));
  // Тёплый старт кэша и планировщик очистки
  warmupCache();
  cleanupUploadsDir();
  setInterval(cleanupUploadsDir, 24 * 60 * 60 * 1000);
}

module.exports = app;