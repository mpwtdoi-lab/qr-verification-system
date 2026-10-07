const express = require('express');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(express.json());
app.use(cors());

const db = {};

// ----------------------------------------------------
// 1. API: สำหรับสร้าง QR Code (ดึง domain อัตโนมัติ)
// ----------------------------------------------------
app.post('/api/create-card', async (req, res) => {
  const { productName, serialNo } = req.body;

  if (!productName || !serialNo) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const baseUrl = `${protocol}://${host}`;

  const tokenId = uuidv4();
  const scanUrl = `${baseUrl}/verify/${tokenId}`;

  db[tokenId] = { productName, serialNo, scanCount: 0 };

  try {
    const qrImage = await QRCode.toDataURL(scanUrl, { width: 300, margin: 2 });
    res.json({ message: 'สร้างสำเร็จ!', scanUrl, qrImage, tokenId });
  } catch (err) {
    res.status(500).json({ error: 'สร้าง QR ไม่สำเร็จ' });
  }
});

// ----------------------------------------------------
// 2. หน้า GUI แอดมิน (Admin Dashboard)
// ----------------------------------------------------
app.get('/admin', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Dashboard - 99th CENTURY</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background-color: #0a0a0a; color: #fff; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .admin-card { background: #161616; border: 1px solid #2a2a2a; border-radius: 20px; width: 100%; max-width: 480px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
        .title { font-size
