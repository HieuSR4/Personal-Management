# Personal Management App

Ung dung web giup ban quan ly tai chinh ca nhan, danh sach viec can lam va ghi chu o cung mot noi. Du lieu duoc luu tru tren Firebase va co the trien khai qua GitHub Pages.

## Tinh nang chinh

- Theo doi thu nhap, chi tieu va so du hien tai.
- Quan ly danh sach viec can lam voi han hoan thanh.
- Luu tru, chinh sua va xoa ghi chu ca nhan.
- Dong bo hoa du lieu theo thoi gian thuc trong tai khoan Firebase cua ban.
- Dang nhap bang Google de bao ve du lieu ca nhan.

## Bat dau

1. Cai dat phu thuoc

   ```bash
   npm install
   ```

2. Cau hinh bien moi truong

   - Tao file `.env` o thu muc goc du an (co the sao chep tu `.env.example`).
   - File `.env` DA DUOC bo qua trong `.gitignore`, vi vay KHONG commit len GitHub. Commit file mau `.env.example` thay the.
   - Dien cac thong tin Firebase cua ban (API key, project ID, ...). Cac bien can thiet:

     ```env
     VITE_FIREBASE_API_KEY=
     VITE_FIREBASE_AUTH_DOMAIN=
     VITE_FIREBASE_PROJECT_ID=
     VITE_FIREBASE_STORAGE_BUCKET=
     VITE_FIREBASE_MESSAGING_SENDER_ID=
     VITE_FIREBASE_APP_ID=
     VITE_FIREBASE_MEASUREMENT_ID=
     ```

   - Neu trien khai tren GitHub Pages, thiet lap them bien `VITE_GITHUB_PAGES_BASE` voi gia tri `/<ten-repo>/`.

3. Chay ung dung o moi truong local

   ```bash
   npm run dev
   ```

   Ung dung san sang tai dia chi `http://localhost:5173/`.

## Trien khai len GitHub Pages

1. Dam bao da cau hinh bien `VITE_GITHUB_PAGES_BASE` khop voi ten repository GitHub cua ban.
2. Chay lenh:

   ```bash
   npm run deploy
   ```

   Lenh nay se build du an va day thu muc `dist` len nhanh `gh-pages`.

## Cau truc thu muc

- `src/lib/firebase.ts`: Khoi tao Firebase va cung cap instance cho cac phan khac.
- `src/contexts/AuthContext.tsx`: Quan ly trang thai dang nhap Google.
- `src/services/dataService.ts`: Cac ham CRUD voi Firestore.
- `src/pages/*`: Cac trang giao dien (Dashboard, Finance, Tasks, Notes).
- `src/components/*`: Thanh phan giao dien tai su dung (header, bao ve dang nhap).

## Kiem thu va build

- Build production: `npm run build`
- Chay linter: `npm run lint`

> Goi y: Ban co the su dung Firebase Emulator bang cach dat `VITE_FIREBASE_EMULATOR=true` trong file `.env` khi phat trien.

## Bao mat khi public repo

- Firebase API key khong thuc su bi mat doi voi ung dung web; key se xuat hien trong bundle. Bao mat duoc dat o Firestore Rules va Authorized Domains.
- De tranh lo file config ca nhan:
  - Khong commit `.env` (da duoc bo qua bang `.gitignore`).
  - Commit `.env.example` lam mau bien moi truong.
  - Neu build bang CI (GitHub Actions), luu bien vao `Repository secrets` va truyen vao buoc build.
  - Giu `Authorized domains` chi gom cac domain ban su dung (localhost, github pages, custom domain).
