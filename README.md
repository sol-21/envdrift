# 🛡️ EnvDrift

> **Sync your `.env` files safely—never leak secrets.**

---

## 🚀 Quick Start

```bash
npx envdrift check   # Find missing keys
npx envdrift sync    # Sync & scrub secrets
```

---

## ✨ Features
- **Smart Scrubbing:** Replaces secrets (TOKEN, API, PASSWORD, etc.) with safe placeholders
- **Drift Detection:** Instantly spots missing keys in `.env` or `.env.example`
- **Modern UI:** Terminal-inspired dashboard (React 19, Tailwind CSS 4, Vite)
- **100% Local:** Never uploads your files

---

## 💻 Local Dev
```bash
git clone https://github.com/YOUR_USERNAME/envdrift.git
cd envdrift
npm install
npm run dev
```

---

## 🔒 Security
All parsing & scrubbing is local. Your secrets never leave your machine.

---

## 📄 License
MIT