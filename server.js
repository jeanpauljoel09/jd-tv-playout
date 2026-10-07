const express = require('express');
const net = require('net');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const CASPAR_HOST = process.env.CASPAR_HOST || '127.0.0.1';
const CASPAR_PORT = Number(process.env.CASPAR_PORT || 5250);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function sendAmcp(command) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let response = '';
    let settled = false;

    const finish = (err) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) reject(err);
      else resolve(response.trim());
    };

    socket.setTimeout(2500);
    socket.connect(CASPAR_PORT, CASPAR_HOST, () => {
      socket.write(`${command}\r\n`);
    });

    socket.on('data', (data) => {
      response += data.toString('utf8');
      if (/^(200|201|202)\b/m.test(response) || /^(400|401|402|403|404|500|501|502|503)\b/m.test(response)) {
        finish();
      }
    });

    socket.on('timeout', () => finish(new Error('CasparCG ne répond pas. Vérifie qu’il est lancé.')));
    socket.on('error', (err) => finish(err));
    socket.on('close', () => {
      if (!settled) finish();
    });
  });
}

app.get('/api/status', async (_req, res) => {
  try {
    const response = await sendAmcp('PING');
    res.json({ ok: true, response: response || 'Connexion établie' });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.post('/api/command', async (req, res) => {
  const command = String(req.body?.command || '').trim();
  if (!command) return res.status(400).json({ ok: false, error: 'Commande manquante' });

  const allowed = /^(PLAY|LOADBG|STOP|CLEAR|PAUSE|RESUME|CG|MIXER|INFO)\b/i;
  if (!allowed.test(command)) {
    return res.status(400).json({ ok: false, error: 'Commande non autorisée dans ce MVP' });
  }

  try {
    const response = await sendAmcp(command);
    res.json({ ok: true, response });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`JD TV Playout: http://localhost:${PORT}`);
  console.log(`CasparCG: ${CASPAR_HOST}:${CASPAR_PORT}`);
});
