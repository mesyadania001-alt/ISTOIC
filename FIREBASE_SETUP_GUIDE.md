# 🔥 Firebase Configuration Guide untuk ISTOIC

Panduan lengkap untuk mengkonfigurasi Firebase Authentication dan Firestore untuk aplikasi ISTOIC.

---

## 📋 Daftar Isi

1. [Persiapan Firebase Project](#persiapan-firebase-project)
2. [Setup Authentication](#setup-authentication)
3. [Setup Firestore Database](#setup-firestore-database)
4. [Konfigurasi Email Templates](#konfigurasi-email-templates)
5. [Environment Variables](#environment-variables)
6. [Testing & Verification](#testing--verification)

---

## 1. Persiapan Firebase Project

### Langkah 1: Buat Firebase Project Baru

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Klik **"Add project"** atau **"Create a project"**
3. Masukkan nama project: `istoic-app` (atau nama yang diinginkan)
4. Pilih **Google Analytics** (opsional, tapi direkomendasikan)
5. Klik **"Create project"**
6. Tunggu hingga project selesai dibuat

### Langkah 2: Tambahkan Web App

1. Di Firebase Console, klik ikon **Web** (`</>`)
2. Masukkan **App nickname**: `ISTOIC Web App`
3. Centang **"Also set up Firebase Hosting"** (opsional)
4. Klik **"Register app"**
5. **Copy semua config values** yang muncul (akan digunakan di `.env`)

---

## 2. Setup Authentication

### Langkah 1: Enable Authentication Methods

1. Di Firebase Console, buka **Authentication** → **Sign-in method**
2. Enable provider berikut:

#### ✅ Email/Password
- Klik **Email/Password**
- Enable **Email/Password** (toggle ON)
- Enable **Email link (passwordless sign-in)** (opsional)
- Klik **Save**

#### ✅ Google Sign-In
- Klik **Google**
- Enable **Google** (toggle ON)
- Masukkan **Project support email** (email Anda)
- Klik **Save**

### Langkah 2: Authorized Domains

1. Di **Authentication** → **Settings** → **Authorized domains**
2. Pastikan domain berikut sudah ada:
   - `localhost` (otomatis)
   - Domain production Anda (contoh: `istoic.app`)
   - Domain PWA Anda (jika berbeda)

**Cara menambah domain:**
- Klik **"Add domain"**
- Masukkan domain (contoh: `istoic.app`)
- Klik **"Add"**

---

## 3. Setup Firestore Database

### Langkah 1: Create Firestore Database

1. Di Firebase Console, buka **Firestore Database**
2. Klik **"Create database"**
3. Pilih mode:
   - **Production mode** (untuk production)
   - **Test mode** (untuk development - **HATI-HATI**: semua user bisa akses)
4. Pilih **location** (pilih yang terdekat dengan user Anda)
   - Contoh: `asia-southeast2` (Jakarta)
5. Klik **"Enable"**

### Langkah 2: Setup Security Rules

1. Di **Firestore Database** → **Rules**
2. Ganti rules dengan berikut:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - hanya user sendiri yang bisa read/write
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Notes collection - hanya user sendiri yang bisa akses
    match /notes/{noteId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Chats collection - hanya user sendiri yang bisa akses
    match /chats/{chatId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

3. Klik **"Publish"**

### Langkah 3: Create Indexes (jika diperlukan)

Jika ada error tentang missing index, Firebase akan memberikan link untuk membuat index otomatis. Klik link tersebut dan buat index.

---

## 4. Konfigurasi Email Templates

### Langkah 1: Customize Email Templates

1. Di Firebase Console, buka **Authentication** → **Templates**
2. Customize template berikut:

#### 📧 Email Verification Template

1. Klik **"Email address verification"**
2. Klik **"Edit"**
3. Customize:
   - **Subject**: `Verify your ISTOIC account`
   - **Body**: 
   ```
   Hello,

   Please verify your email address by clicking the link below:

   %LINK%

   If you didn't create an ISTOIC account, you can safely ignore this email.

   Best regards,
   ISTOIC Team
   ```
4. Klik **"Save"**

#### 🔑 Password Reset Template

1. Klik **"Password reset"**
2. Klik **"Edit"**
3. Customize:
   - **Subject**: `Reset your ISTOIC password`
   - **Body**:
   ```
   Hello,

   You requested to reset your password. Click the link below to reset:

   %LINK%

   If you didn't request this, you can safely ignore this email.

   This link will expire in 1 hour.

   Best regards,
   ISTOIC Team
   ```
4. Klik **"Save"**

#### 📧 Email Change Template

1. Klik **"Email address change"**
2. Klik **"Edit"**
3. Customize sesuai kebutuhan
4. Klik **"Save"**

### Langkah 2: Action URL Configuration

1. Di **Authentication** → **Settings** → **Authorized domains**
2. Pastikan domain production sudah ditambahkan
3. Di **Action URL**, set:
   - **Production URL**: `https://yourdomain.com` (ganti dengan domain Anda)
   - **Development URL**: `http://localhost:5173` (atau port yang digunakan)

---

## 5. Environment Variables

### Langkah 1: Buat File `.env`

Di root project, buat file `.env` (atau `.env.local`):

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX (opsional, untuk Analytics)
```

### Langkah 2: Dapatkan Config Values

1. Di Firebase Console, buka **Project Settings** (ikon gear ⚙️)
2. Scroll ke bawah ke **"Your apps"**
3. Klik ikon **Web** (`</>`)
4. Copy semua values:
   - `apiKey` → `VITE_FIREBASE_API_KEY`
   - `authDomain` → `VITE_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `VITE_FIREBASE_PROJECT_ID`
   - `storageBucket` → `VITE_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` → `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` → `VITE_FIREBASE_APP_ID`
   - `measurementId` → `VITE_FIREBASE_MEASUREMENT_ID` (jika ada)

### Langkah 3: Security Best Practices

⚠️ **PENTING**: 
- Jangan commit `.env` ke Git
- Pastikan `.env` sudah ada di `.gitignore`
- Untuk production, gunakan environment variables di hosting platform (Vercel, Netlify, dll)

---

## 6. Testing & Verification

### Test Authentication Flow

1. **Test Email/Password Registration**
   - Buka aplikasi
   - Klik "Buat akun baru"
   - Isi form dan submit
   - Cek email untuk verification link
   - Klik link untuk verify email

2. **Test Google Sign-In**
   - Klik "Lanjutkan dengan Google"
   - Pilih Google account
   - Pastikan redirect berhasil
   - Pastikan user profile terbuat

3. **Test Password Reset**
   - Klik "Lupa akun?"
   - Masukkan email
   - Cek email untuk reset link
   - Klik link dan reset password

4. **Test PIN Setup**
   - Setelah login pertama kali
   - Pastikan flow masuk ke "SETUP_PIN" (bukan langsung LOCKED)
   - Buat PIN baru
   - Pastikan PIN tersimpan

### Test Firestore

1. Buka **Firestore Database** → **Data**
2. Pastikan collection `users` terbuat setelah user register
3. Pastikan data user tersimpan dengan benar:
   - `uid`
   - `email`
   - `displayName`
   - `istokId`
   - `codename`
   - `photoURL`

---

## 🔧 Troubleshooting

### Error: "Firebase env missing"

**Solusi**: Pastikan semua environment variables sudah di-set di `.env`

### Error: "unauthorized-domain"

**Solusi**: Tambahkan domain ke **Authentication** → **Settings** → **Authorized domains**

### Error: "popup-blocked" atau "window.closed"

**Solusi**: 
- Aplikasi sudah otomatis fallback ke redirect untuk iOS PWA
- Pastikan popup tidak diblokir browser
- Untuk production, gunakan redirect flow

### Email tidak terkirim

**Solusi**:
1. Cek **Authentication** → **Templates** sudah dikonfigurasi
2. Cek spam folder
3. Pastikan email sender sudah verified di Firebase
4. Cek quota email di Firebase Console

### User baru langsung diminta PIN padahal belum buat

**Solusi**: Sudah diperbaiki - user baru akan selalu masuk ke SETUP_PIN dulu

---

## 📚 Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

---

## ✅ Checklist Setup

- [ ] Firebase project dibuat
- [ ] Web app registered
- [ ] Email/Password authentication enabled
- [ ] Google Sign-In enabled
- [ ] Authorized domains dikonfigurasi
- [ ] Firestore database dibuat
- [ ] Security rules dikonfigurasi
- [ ] Email templates dikustomisasi
- [ ] Environment variables di-set
- [ ] Testing semua flow berhasil

---

**Last Updated**: 2024
**Version**: 1.0
