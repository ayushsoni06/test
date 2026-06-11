const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const DATA_FILE = path.join(__dirname, 'data', 'referrals.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Client lookup
app.post('/api/lookup', (req, res) => {
  const { company, firstName, lastName, email } = req.body;
  if (!company || !firstName || !lastName || !email) {
    return res.status(400).json({ error: 'All fields required.' });
  }

  const data = loadData();
  const key = `${firstName.trim().toLowerCase()} ${lastName.trim().toLowerCase()}`;
  const matches = data.filter(r => r.clientName.toLowerCase() === key);

  if (matches.length === 0) {
    return res.json({ found: false, referrals: [] });
  }

  const referrals = matches.map(r => ({
    refereeName: r.refereeName,
    amountOwed: r.amountOwed,
  }));

  const totalOwed = matches.reduce((sum, r) => sum + parseFloat(r.amountOwed || 0), 0);

  res.json({ found: true, referrals, totalOwed });
});

// Claim referral — just logs the claim with wire info
app.post('/api/claim', (req, res) => {
  const { firstName, lastName, email, company, wireInfo } = req.body;
  const CLAIMS_FILE = path.join(__dirname, 'data', 'claims.json');
  let claims = [];
  if (fs.existsSync(CLAIMS_FILE)) {
    claims = JSON.parse(fs.readFileSync(CLAIMS_FILE, 'utf8'));
  }
  claims.push({
    timestamp: new Date().toISOString(),
    clientName: `${firstName} ${lastName}`,
    company,
    email,
    wireInfo,
  });
  fs.mkdirSync(path.dirname(CLAIMS_FILE), { recursive: true });
  fs.writeFileSync(CLAIMS_FILE, JSON.stringify(claims, null, 2));
  res.json({ success: true });
});

// Admin: upload CSV
app.post('/api/admin/upload', upload.single('csv'), (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET && process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  let records;
  try {
    records = parse(req.file.buffer.toString(), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (e) {
    return res.status(400).json({ error: 'Invalid CSV: ' + e.message });
  }

  const mode = req.query.mode === 'replace' ? 'replace' : 'append';
  const existing = mode === 'replace' ? [] : loadData();

  const newRows = records.map(r => ({
    clientName: (r['client_name'] || r['Client Name'] || '').toLowerCase().trim(),
    refereeName: r['referee_name'] || r['Referee Name'] || '',
    amountOwed: parseFloat(r['amount_owed'] || r['Amount Owed'] || 0),
  })).filter(r => r.clientName);

  saveData([...existing, ...newRows]);
  res.json({ success: true, added: newRows.length, mode });
});

// Admin: view all data
app.get('/api/admin/data', (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET && process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(loadData());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
