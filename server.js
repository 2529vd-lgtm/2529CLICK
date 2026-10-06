const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ROOT = __dirname;
// Where photos and photos.json are kept. On a host, point this at a persistent volume.
const STORAGE_DIR = process.env.STORAGE_DIR || ROOT;
const UPLOAD_DIR = path.join(STORAGE_DIR, 'uploads');
const DATA_DIR = path.join(STORAGE_DIR, 'data');
const DB_FILE = path.join(DATA_DIR, 'photos.json');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- tiny JSON "database" ----------
let photos = [];
try {
  photos = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
} catch {
  photos = [];
}

let writeChain = Promise.resolve();
function save() {
  // Serialize writes and write atomically so the file never ends up half-written.
  writeChain = writeChain.then(async () => {
    const tmp = DB_FILE + '.tmp';
    await fs.promises.writeFile(tmp, JSON.stringify(photos, null, 2));
    await fs.promises.rename(tmp, DB_FILE);
  }).catch((err) => console.error('Failed to save data:', err));
  return writeChain;
}

// ---------- uploads ----------
const EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + EXT[file.mimetype]),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (EXT[file.mimetype]) cb(null, true);
    else cb(new Error('Only JPG, PNG, WEBP, GIF or AVIF images are allowed'));
  },
});

// ---------- helpers ----------
function isAdmin(req) {
  const given = Buffer.from(String(req.get('x-admin-password') || ''));
  const real = Buffer.from(ADMIN_PASSWORD);
  return given.length === real.length && crypto.timingSafeEqual(given, real);
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Wrong password' });
  next();
}

function clean(text, max) {
  return String(text || '').trim().slice(0, max);
}

// ---------- app ----------
const app = express();
app.use(express.json());
app.use(express.static(path.join(ROOT, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true }));

app.get('/api/photos', (req, res) => {
  const list = [...photos];
  if (req.query.sort === 'popular') {
    list.sort((a, b) => b.views - a.views || b.createdAt.localeCompare(a.createdAt));
  } else {
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  res.json(list);
});

app.post('/api/login', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Wrong password' });
  res.json({ ok: true });
});

app.post('/api/photos', requireAdmin, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Please choose an image' });

    const photo = {
      id: crypto.randomUUID(),
      file: '/uploads/' + req.file.filename,
      title: clean(req.body.title, 120),
      description: clean(req.body.description, 5000),
      views: 0,
      createdAt: new Date().toISOString(),
    };
    photos.push(photo);
    await save();
    res.status(201).json(photo);
  });
});

app.post('/api/photos/:id/view', async (req, res) => {
  const photo = photos.find((p) => p.id === req.params.id);
  if (!photo) return res.status(404).json({ error: 'Not found' });
  photo.views += 1;
  await save();
  res.json({ views: photo.views });
});

app.patch('/api/photos/:id', requireAdmin, async (req, res) => {
  const photo = photos.find((p) => p.id === req.params.id);
  if (!photo) return res.status(404).json({ error: 'Not found' });
  if (req.body.title !== undefined) photo.title = clean(req.body.title, 120);
  if (req.body.description !== undefined) photo.description = clean(req.body.description, 5000);
  await save();
  res.json(photo);
});

app.delete('/api/photos/:id', requireAdmin, async (req, res) => {
  const index = photos.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  const [photo] = photos.splice(index, 1);
  await save();
  fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(photo.file))).catch(() => {});
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`2529 CLICK running at http://localhost:${PORT}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('⚠  Using default password "admin123". Set ADMIN_PASSWORD to change it.');
  }
});
