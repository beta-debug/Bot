// netlify/functions/notify.js
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
    const data = JSON.parse(event.body || '{}');
    const { user, pack, qty, pricePerUnit, total } = data;

// ...
const token  = process.env.TELEGRAM_TOKEN;
const chatIds = (process.env.TELEGRAM_CHAT_ID || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (!token || chatIds.length === 0) {
  return { statusCode: 500, body: 'Missing TELEGRAM_TOKEN or TELEGRAM_CHAT_ID' };
}

const text =
`🧾 คำขอเติมแพ็กใหม่
• User: ${user}
• แพ็ก: ${pack}
• จำนวนไม้: ${qty}
• ราคา/ไม้: ${Number(pricePerUnit).toFixed(2)}
• รวม: ${Number(total).toFixed(2)} บาท
⏰ ${new Date().toLocaleString()}`;

const api = `https://api.telegram.org/bot${token}/sendMessage`;

// ส่งหาทุก chat id พร้อมกัน
await Promise.all(chatIds.map(cid =>
  fetch(api, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ chat_id: cid, text })
  }).then(r => r.json())
    .then(j => { if (!j.ok) throw new Error(j.description || 'Telegram failed'); })
));
// ...
return { statusCode: 200, body: 'OK' };

  } catch (err) {
    return { statusCode: 500, body: 'ERR: ' + err.message };
  }
};
