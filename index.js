const express = require('express');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

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
        .title { font-size: 22px; font-weight: 800; color: #ff4d4d; text-align: center; letter-spacing: 1.5px; margin-bottom: 6px; }
        .subtitle { font-size: 12px; color: #666; text-align: center; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 28px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; font-size: 13px; color: #aaa; font-weight: 600; margin-bottom: 8px; }
        input { width: 100%; background: #0d0d0d; border: 1px solid #333; border-radius: 10px; padding: 12px 16px; color: #fff; font-size: 14px; outline: none; transition: border-color 0.2s; }
        input:focus { border-color: #ff4d4d; }
        .btn-submit { width: 100%; background: #ff4d4d; color: #fff; border: none; border-radius: 10px; padding: 14px; font-size: 15px; font-weight: 700; cursor: pointer; transition: background 0.2s; margin-top: 10px; }
        .btn-submit:hover { background: #e63939; }
        .result-box { display: none; margin-top: 30px; border-top: 1px dashed #333; padding-top: 24px; text-align: center; }
        .qr-img { width: 200px; height: 200px; border-radius: 12px; background: #fff; padding: 10px; margin: 0 auto 16px; }
        .url-box { background: #0d0d0d; border: 1px solid #222; border-radius: 8px; padding: 10px; font-size: 12px; color: #888; word-break: break-all; margin-bottom: 12px; }
        .btn-action { background: #222; color: #ff4d4d; border: 1px solid #ff4d4d; border-radius: 8px; padding: 8px 16px; font-size: 12px; font-weight: 600; cursor: pointer; margin: 4px; text-decoration: none; display: inline-block; }
        .btn-action:hover { background: #ff4d4d; color: #fff; }
      </style>
    </head>
    <body>

      <div class="admin-card">
        <div class="title">99th CENTURY</div>
        <div class="subtitle">QR Code Generator Panel</div>

        <form id="qrForm">
          <div class="form-group">
            <label>ชื่อสินค้า (Product Name)</label>
            <input type="text" id="productName" placeholder="เช่น 99th T-Shirt Limited" required>
          </div>
          <div class="form-group">
            <label>หมายเลขซีเรียล (Serial Number)</label>
            <input type="text" id="serialNo" placeholder="เช่น 99CENT-2026-001" required>
          </div>
          <button type="submit" class="btn-submit">⚡ สร้าง QR Code ตรวจแท้</button>
        </form>

        <div class="result-box" id="resultBox">
          <img id="qrImg" class="qr-img" src="" alt="QR Code">
          <div class="url-box" id="urlBox"></div>
          <div>
            <a id="openBtn" href="" target="_blank" class="btn-action">🔗 เปิดทดสอบหน้าตรวจแท้</a>
            <button onclick="copyLink()" class="btn-action">📋 ก๊อปปี้ลิงก์</button>
          </div>
        </div>
      </div>

      <script>
        let currentUrl = '';
        document.getElementById('qrForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const productName = document.getElementById('productName').value;
          const serialNo = document.getElementById('serialNo').value;

          const res = await fetch('/api/create-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productName, serialNo })
          });

          const data = await res.json();
          if (res.ok) {
            document.getElementById('qrImg').src = data.qrImage;
            document.getElementById('urlBox').innerText = data.scanUrl;
            document.getElementById('openBtn').href = data.scanUrl;
            document.getElementById('resultBox').style.display = 'block';
            currentUrl = data.scanUrl;
          } else {
            alert(data.error || 'เกิดข้อผิดพลาด');
          }
        });

        function copyLink() {
          navigator.clipboard.writeText(currentUrl);
          alert('ก๊อปปี้ลิงก์เรียบร้อยแล้ว!');
        }
      </script>

    </body>
    </html>
  `);
});

// ----------------------------------------------------
// 3. API: ฝั่งผู้ซื้อสแกน QR Code
// ----------------------------------------------------
app.get('/verify/:tokenId', (req, res) => {
  const { tokenId } = req.params;
  const item = db[tokenId];

  if (!item) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="lo">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Failed - 99th CENTURY</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: "Noto Sans Lao", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          body { background-color: #0d0d0d; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
          .card { background: #1a1a1a; border: 1px solid #333; border-radius: 20px; width: 100%; max-width: 380px; padding: 30px 20px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .icon-box { width: 70px; height: 70px; background: rgba(255, 77, 77, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: #ff4d4d; font-size: 36px; border: 2px solid #ff4d4d; }
          .title { font-size: 20px; font-weight: 700; color: #ff4d4d; margin-bottom: 10px; }
          .desc { font-size: 14px; color: #888; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-box">✕</div>
          <div class="title">ບໍ່ພົບຂໍ້ມູນໃບຮັບປະກັນ</div>
          <div class="desc">ລະຫັດໂຄດນີ້ບໍ່ມີຢູ່ໃນระบบຂອງແອບ, ກະລຸນາລະມັດລະວັງສິນຄ້າລອກຮຽນແບບ ຫຼື ໃບຮັບປະກັນປອມ.</div>
        </div>
      </body>
      </html>
    `);
  }

  item.scanCount += 1;

  res.send(`
    <!DOCTYPE html>
    <html lang="lo">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Authenticity Certificate - 99th CENTURY</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: "Noto Sans Lao", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background-color: #0a0a0a; color: #ffffff; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
        .cert-card { background: linear-gradient(145deg, #161616, #1f1f1f); border: 1px solid #2a2a2a; border-radius: 24px; width: 100%; max-width: 400px; padding: 28px 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); position: relative; overflow: hidden; }
        .cert-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, #ff1a1a, #ff4d4d); }
        .brand-header { text-align: center; margin-bottom: 24px; }
        .brand-name { font-size: 20px; font-weight: 900; letter-spacing: 2px; color: #ff4d4d; text-transform: uppercase; }
        .brand-sub { font-size: 11px; color: #666; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
        
        .status-badge { background: rgba(46, 213, 115, 0.1); border: 1.5px solid #2ed573; border-radius: 16px; padding: 16px; text-align: center; margin-bottom: 24px; }
        .status-icon { font-size: 28px; margin-bottom: 4px; color: #2ed573; }
        .status-text { font-size: 18px; font-weight: 700; color: #2ed573; }
        .status-desc { font-size: 12px; color: #a4b0be; margin-top: 4px; }

        .info-group { background: #121212; border-radius: 16px; padding: 18px; margin-bottom: 20px; border: 1px solid #222; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
        .info-row:last-child { margin-bottom: 0; }
        .info-label { color: #777; font-weight: 500; }
        .info-value { color: #fff; font-weight: 600; text-align: right; }

        .warning-box { background: rgba(255, 170, 0, 0.1); border-left: 4px solid #ffaa00; border-radius: 8px; padding: 12px 14px; font-size: 12px; color: #ffcc66; line-height: 1.5; margin-bottom: 20px; }

        .footer { text-align: center; font-size: 11px; color: #555; letter-spacing: 0.5px; }
      </style>
    </head>
    <body>

      <div class="cert-card">
        <div class="brand-header">
          <div class="brand-name">99th CENTURY AUTHENTIC</div>
          <div class="brand-sub">ໃບຮັບປະກັນສິນຄ້າແທ້</div>
        </div>

        <div class="status-badge">
          <div class="status-icon">✓</div>
          <div class="status-text">ຜ່ານການກວດສອບສິນຄ້າແທ້</div>
          <div class="status-desc">ກວດສອບຜ່ານເກນມາດຕະຖານສິນຄ້າແທ້ 100%</div>
        </div>

        <div class="info-group">
          <div class="info-row">
            <span class="info-label">ຊື່ສິນຄ້າ</span>
            <span class="info-value">${item.productName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Serial No.</span>
            <span class="info-value">${item.serialNo}</span>
          </div>
          <div class="info-row">
            <span class="info-label">ຈຳນວນການສະແກນ</span>
            <span class="info-value" style="color: ${item.scanCount > 1 ? '#ffaa00' : '#ff4d4d'};">${item.scanCount} ຄັ້ງ</span>
          </div>
        </div>

        ${
          item.scanCount > 1 
            ? `<div class="warning-box">
                ⚠️ <b>ຂໍ້ຄວນລະວັງ:</b> QR Code ນີ້ຖືກສະແກນມາແລ້ວ ${item.scanCount} ຄັ້ງ. ຖ້າທ່ານຊື້ສິນຄ້ານີ້ເປັນສິນຄ້າໃໝ່, ອາດມີຄວາມສ່ຽງທີ່ໃບຮັບປະກັນຖືກຄັດລອກ/ເລກຊ້ຳ.
               </div>`
            : `<div style="background: rgba(255, 77, 77, 0.1); border-radius: 8px; padding: 10px; font-size: 12px; color: #ff4d4d; text-align: center; margin-bottom: 20px;">
                🎉 ການສະແກນເປີດໃຊ້ງານຄັ້ງທຳອິດ
               </div>`
        }

        <div class="footer">
          OFFICIAL AUTHENTICATION SYSTEM • 99th CENTURY VERIFIED
        </div>
      </div>

    </body>
    </html>
  `);
});

// ----------------------------------------------------
// 4. เริ่มต้นรัน Server (รองรับ Port ทั้งแบบ Local และ Render Cloud)
// ----------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));