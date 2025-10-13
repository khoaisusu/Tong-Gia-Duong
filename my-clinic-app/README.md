# Hệ thống Quản lý Phòng khám Tống Gia Đường V2.0

**Phòng khám xoa bóp bấm huyệt cổ truyền - Bác sỹ Lực**

## 📋 Giới thiệu

Hệ thống quản lý phòng khám Tống Gia Đường V2.0 là giải pháp toàn diện cho việc quản lý khách hàng, liệu trình, đơn hàng và nhân viên của phòng khám xoa bóp bấm huyệt cổ truyền.

### Tính năng chính:
- 🔐 Đăng nhập bảo mật với Google OAuth
- 👥 Quản lý khách hàng (thêm, sửa, xóa, tìm kiếm)
- 🛍️ Quản lý sản phẩm và dịch vụ
- 📋 Tạo và quản lý đơn hàng
- 💆 Quản lý liệu trình điều trị
- 📅 Theo dõi lịch hẹn và lượt trị liệu
- 👨‍⚕️ Quản lý nhân viên và phân quyền
- 📊 Báo cáo thống kê doanh thu
- 💳 Tạo mã QR thanh toán

## 🚀 Công nghệ sử dụng

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Google Sheets API
- **Authentication**: NextAuth.js với Google OAuth
- **State Management**: React Query + Zustand
- **Deployment**: Vercel

## 📦 Cài đặt

### Bước 1: Clone dự án

```bash
git clone https://github.com/your-username/tong-gia-duong-clinic.git
cd tong-gia-duong-clinic
```

### Bước 2: Cài đặt dependencies

```bash
npm install
# hoặc
yarn install
```

### Bước 3: Cấu hình Google Cloud

#### 3.1. Tạo Google Cloud Project
1. Truy cập [Google Cloud Console](https://console.cloud.google.com)
2. Tạo project mới hoặc chọn project có sẵn
3. Enable APIs:
   - Google Sheets API
   - Google Drive API (nếu cần)

#### 3.2. Tạo Service Account
1. Vào **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Đặt tên (vd: "sheets-access")
4. Tạo và tải JSON key
5. Lưu email của service account

#### 3.3. Cấu hình OAuth 2.0
1. Vào **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Chọn **Web application**
4. Thêm Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.com/api/auth/callback/google` (production)
5. Lưu Client ID và Client Secret

### Bước 4: Thiết lập Google Sheets

#### 4.1. Tạo Google Spreadsheet
1. Tạo một Google Spreadsheet mới
2. Tạo các sheet với tên:
   - Khách hàng
   - Sản phẩm
   - Dịch vụ
   - Đơn hàng
   - Liệu trình
   - Lượt trị liệu
   - Nhân viên
   - Giao dịch

#### 4.2. Chia sẻ quyền
1. Share spreadsheet với email của Service Account
2. Cấp quyền **Editor**
3. Lưu ID của spreadsheet (trong URL)

#### 4.3. Cấu trúc dữ liệu sheets

**Sheet "Khách hàng":**
| Mã KH | Họ và tên | Tên thường gọi | Số điện thoại | Email | Ngày sinh | Giới tính | Địa chỉ | Tiền sử bệnh | Ghi chú | Ngày tạo | Trạng thái | Người giới thiệu |

**Sheet "Nhân viên":**
| Mã NV | Họ và tên | Số điện thoại | Email | Chức vụ | Chuyên môn | Ngày vào làm | Quyền hạn | Trạng thái | Hoa hồng % |

*(Thêm các sheet khác với cấu trúc tương tự theo mapping trong `utils/columnMapping.ts`)*

### Bước 5: Cấu hình biến môi trường

1. Copy file `.env.local.example` thành `.env.local`
2. Điền các thông tin cần thiết:

```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-random-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Google Sheets API
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GOOGLE_SHEET_ID=your-spreadsheet-id
```

**Lưu ý về GOOGLE_PRIVATE_KEY:**
- Copy toàn bộ private key từ file JSON
- Giữ nguyên format với `\n` cho xuống dòng
- Đặt trong dấu ngoặc kép

### Bước 6: Thêm nhân viên đầu tiên

Trước khi chạy ứng dụng, thêm ít nhất 1 nhân viên vào sheet "Nhân viên":
- Mã NV: NV001
- Email: your-email@gmail.com (email sẽ dùng để đăng nhập)
- Quyền hạn: Admin
- Trạng thái: Hoạt động

### Bước 7: Chạy ứng dụng

```bash
npm run dev
# hoặc
yarn dev
```

Truy cập http://localhost:3000

## 🌐 Triển khai lên Vercel

### Bước 1: Push code lên GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### Bước 2: Deploy trên Vercel

1. Đăng nhập [Vercel](https://vercel.com)
2. Import project từ GitHub
3. Cấu hình Environment Variables:
   - Thêm tất cả biến từ `.env.local`
   - Đổi `NEXTAUTH_URL` thành domain production
4. Deploy

### Bước 3: Cập nhật Google OAuth

1. Quay lại Google Cloud Console
2. Thêm production URL vào Authorized redirect URIs
3. Thêm domain vào Authorized domains

## 📱 Sử dụng hệ thống

### Đăng nhập
1. Truy cập trang đăng nhập
2. Click "Đăng nhập với Google"
3. Chọn tài khoản Google đã được thêm vào sheet Nhân viên

### Quản lý khách hàng
1. Vào menu **Khách hàng**
2. Click **Thêm khách hàng** để tạo mới
3. Điền thông tin và lưu
4. Sử dụng thanh tìm kiếm để tìm khách hàng
5. Click icon sửa/xóa để quản lý

### Tạo đơn hàng
1. Vào menu **Đơn hàng**
2. Click **Tạo đơn hàng**
3. Chọn khách hàng
4. Thêm sản phẩm
5. Xác nhận và tạo QR thanh toán

### Tạo liệu trình
1. Vào menu **Liệu trình**
2. Click **Tạo liệu trình**
3. Chọn khách hàng
4. Thêm dịch vụ và sản phẩm
5. Đặt số buổi điều trị
6. Tạo QR thanh toán

## 🔧 Cấu trúc dự án

```
tong-gia-duong-clinic/
├── pages/                 # Next.js pages
│   ├── api/              # API routes
│   ├── khach-hang/       # Customer pages
│   ├── don-hang/         # Order pages
│   └── lieu-trinh/       # Treatment pages
├── components/           # React components
│   ├── Layout.tsx       # Main layout
│   ├── forms/           # Form components
│   └── common/          # Shared components
├── utils/               # Utilities
│   ├── googleSheets.ts  # Google Sheets helpers
│   └── columnMapping.ts # Data mapping
├── styles/              # CSS styles
├── public/              # Static files
└── store/               # State management
```

## 🛠️ Development

### Thêm tính năng mới

1. Tạo sheet mới trong Google Spreadsheet
2. Thêm mapping trong `utils/columnMapping.ts`
3. Tạo API route trong `pages/api/`
4. Tạo UI component
5. Test locally
6. Deploy

### Debug

Kiểm tra logs:
```bash
npm run dev
# Xem console output
```

Kiểm tra Google Sheets:
- Mở spreadsheet trực tiếp
- Xem dữ liệu được ghi

## 🔒 Bảo mật

### Quan trọng - KHÔNG BAO GIỜ:
- ❌ Commit file `.env.local` lên Git
- ❌ Share credentials qua email/chat
- ❌ Để public Google Sheets
- ❌ Push private keys lên repository

### Checklist bảo mật:
- ✅ File `.env.local` đã có trong `.gitignore`
- ✅ Google Sheets chỉ share với Service Account
- ✅ OAuth redirect URIs chỉ có domain chính thức
- ✅ Định kỳ rotate credentials (3-6 tháng)
- ✅ Review access logs trên Google Cloud Console

### Nếu credentials bị lộ:
1. 🚨 **NGAY LẬP TỨC** revoke credentials cũ
2. Generate credentials mới
3. Update `.env.local` và Vercel environment variables
4. Xóa credentials khỏi Git history nếu đã commit:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env.local" \
     --prune-empty --tag-name-filter cat -- --all
   ```
5. Force push (cẩn thận!): `git push origin --force --all`

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra lại cấu hình
2. Xem logs trong console
3. Đảm bảo Google Sheets có quyền đúng
4. Liên hệ: [email@example.com]

## 📄 License

© 2024 Phòng khám Tống Gia Đường - Bác sỹ Lực. All rights reserved.

---

**Phát triển bởi**: Bác sỹ Lực  
**Version**: 2.0.0  
**Last Updated**: 2024