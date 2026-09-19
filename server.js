const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
// Put the SAME MongoDB URI used by MIYORA bot here, or set MONGO_URI on Heroku.
const MONGO_URI = process.env.MONGO_URI || 'YOUR_MONGODB_URI';
const MONGO_DB = process.env.MONGO_DB || 'sakuradb-1';

let client, db, telemetry;
async function connectMongo() {
  if (db) return;
  if (!MONGO_URI || MONGO_URI === 'YOUR_MONGODB_URI') throw new Error('MONGO_URI is missing');
  client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(MONGO_DB);
  telemetry = db.collection('bot_telemetry');
  console.log('✅ MongoDB connected — bot_telemetry ready');
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/dashboard', async (req, res) => {
  try {
    await connectMongo();
    const docs = await telemetry.find({}).sort({ updatedAt: -1 }).toArray();
    const now = Date.now();
    const bots = docs.map(d => ({
      ...d,
      _id: String(d._id),
      liveStatus: d.lastSeen && now - new Date(d.lastSeen).getTime() < 25000 ? 'online' : 'offline'
    }));
    const online = bots.filter(b => b.liveStatus === 'online').length;
    res.json({ ok: true, total: bots.length, online, offline: bots.length - online, bots });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/health', async (req, res) => {
  try { await connectMongo(); res.json({ ok: true, mongo: 'connected', time: new Date() }); }
  catch (e) { res.status(500).json({ ok: false, mongo: 'error', error: e.message }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

connectMongo().catch(e => console.error('❌ MongoDB:', e.message));
app.listen(PORT, () => console.log(`🌸 MIYORA MD ADMIN — Port ${PORT}`));
