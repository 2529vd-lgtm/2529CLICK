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

## Online daalna (Railway pe, step by step)

1. https://railway.com pe jao aur **Login with GitHub** se account banao.
2. **New Project** → **Deploy from GitHub repo** → `2529CLICK` repo chuno.
3. Service khulegi. **Settings** → **Source** mein branch `claude/gracious-knuth-mhefzl` chuno (ya pehle us branch ko `main` mein merge kar lo).
4. **Variables** tab mein do variables daalo:
   - `ADMIN_PASSWORD` = apna strong password
   - `STORAGE_DIR` = `/data`
5. Service pe right-click (ya **Command palette**) → **Attach Volume** → mount path `/data`. Isi mein photos permanently save hongi.
6. **Settings** → **Networking** → **Generate Domain**. Aapko `kuch-naam.up.railway.app` jaisa link milega. Yahi aapki website hai.
7. Deploy hone ka wait karo (1–2 minute), phir link kholo.

## Password badalna

Railway pe: **Variables** tab → `ADMIN_PASSWORD` ki value badlo → save. Railway khud redeploy kar dega. Photos safe rahengi.

Apne computer pe: `ADMIN_PASSWORD="naya-password" npm start`

## Photo upload karna

1. Apni website kholo aur upar right mein **Upload** button dabao.
2. Password daalo → **Login**.
3. Photo box mein drag karo ya **browse** pe click karke photo chuno (mobile pe gallery khul jayegi).
4. Title aur description likho (optional).
5. **Publish** dabao. Photo Latest tab mein sabse upar aa jayegi.

Edit ya delete ke liye: login ke baad photo pe click karo → **Edit** ya **Delete**.
