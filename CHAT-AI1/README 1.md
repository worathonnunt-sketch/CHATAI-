# CHATAI — วิธีติดตั้งและรันโปรเจกต์

โปรเจกต์นี้แบ่งเป็น 2 ส่วน คือ **BACKEND** (Node.js + Express) และ **FRONTEND** (React + Vite) ต้องรันทั้งคู่พร้อมกัน

## สิ่งที่ต้องมี

- Node.js 18 ขึ้นไป (ตรวจสอบด้วย `node -v`)
- API key ของผู้ให้บริการ LLM ที่รองรับรูปแบบ OpenAI-compatible

## 1) ติดตั้งและรัน Backend

```bash
cd CHAT-AI1/BACKEND
npm install
```

สร้างไฟล์ `.env` ในโฟลเดอร์ `BACKEND`:

```env
LLM_API_KEY=your_api_key
LLM_BASE_URL=https://your-llm-provider/v1
LLM_MODEL=your_model_name
PORT=3000
```

| ตัวแปร | คำอธิบาย |
| --- | --- |
| `LLM_API_KEY` | API key ของผู้ให้บริการ LLM (จำเป็น) |
| `LLM_BASE_URL` | Base URL ของ OpenAI-compatible API (จำเป็น) |
| `LLM_MODEL` | ชื่อโมเดลที่ใช้ (จำเป็น) |
| `PORT` | พอร์ตของเซิร์ฟเวอร์ (ไม่ใส่ = `3000`) |

## 2) ติดตั้งและรัน Frontend

เปิดเทอร์มินัลอีกหน้าต่าง:

```bash
cd CHAT-AI1/FRONTEND
npm install
npm run dev
```
เปิด `http://localhost:5173` ในเบราว์เซอร์
รันเซิร์ฟเวอร์:

ตอนรันบนเครื่อง Vite จะส่งคำขอ `/api` ไปที่ `http://localhost:3000` ให้อัตโนมัติ จึงไม่ต้องตั้งค่า URL เพิ่ม (ถ้าเปลี่ยน `PORT` ของ Backend ต้องแก้ proxy ใน `FRONTEND/vite.config.js` ให้ตรงกัน)

## Build สำหรับ production

```bash
cd CHAT-AI1/FRONTEND
npm run build
```

ไฟล์ที่ได้อยู่ในโฟลเดอร์ `dist/` ถ้า Backend อยู่คนละที่กับ Frontend ให้ตั้งตัวแปร `VITE_API_URL` เป็น URL ของ Backend (เช่น `https://your-backend.onrender.com`) ก่อน build

## แก้ปัญหาเบื้องต้น

| อาการ | วิธีแก้ |
| --- | --- |
| แชตขึ้นว่า "เชื่อมต่อ backend ไม่ได้" | ตรวจว่า Backend รันอยู่ และพอร์ตตรงกับที่ตั้งใน `vite.config.js` |
| ขึ้นว่า "ยังไม่ได้ตั้ง LLM_API_KEY" | สร้าง/ตรวจไฟล์ `.env` ใน `BACKEND` แล้วรีสตาร์ท Backend |
| ขึ้นว่า "เรียก AI ไม่สำเร็จ" | ตรวจ `LLM_API_KEY`, `LLM_BASE_URL` และ `LLM_MODEL` |
| ขึ้นว่า "เรียก AI ถี่เกินโควตา" | รอสักครู่แล้วลองใหม่ |
