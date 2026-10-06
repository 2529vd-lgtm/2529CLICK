# 2529 CLICK — Photography Website

Ek personal photography website: photo upload karo, uske baare mein likho, aur visitors ko **Latest** aur **Most Viewed** photos dikhein.

## Features

- **Latest / Most Viewed** tabs: website kholte hi sabse nayi photos dikhti hain.
- **Upload**: drag & drop ya browse karke upload karo. Title aur description dono optional hain.
- **Lightbox**: photo pe click karne se badi photo, description, date aur views dikhte hain. Arrow keys ya swipe se next/previous photo pe ja sakte ho.
- **View counter**: har photo ke views gine jaate hain (ek browser session mein ek photo ek hi baar ginti hai).
- **Edit / Delete**: login karne ke baad lightbox mein Edit aur Delete buttons aate hain.
- Dark theme, mobile pe bhi theek chalti hai.

## Chalane ka tarika

Node.js 18 ya usse naya version chahiye.

```bash
npm install
ADMIN_PASSWORD="apna-password" npm start
```

Phir browser mein kholo: http://localhost:3000

> Agar `ADMIN_PASSWORD` set nahi kiya to default password `admin123` hoga. Website online daalne se pehle isse zaroor badlo.

Upload karne ke liye upar **Upload** button dabao aur password daalo. Visitors bina password ke sirf photos dekh sakte hain.

## Data kahan save hota hai

- Photos: `uploads/` folder
- Titles, descriptions aur views: `data/photos.json`

Dono folders git mein commit nahi hote. Backup ke liye ye dono folders copy kar lo.

## Online daalna (deploy)

Koi bhi Node.js hosting chalegi (Render, Railway, VPS, etc.). Start command `npm start` hai. `ADMIN_PASSWORD` environment variable set karo, aur `uploads/` aur `data/` ke liye persistent disk lagao, warna restart pe photos chali jaayengi.
