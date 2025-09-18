# VietQR Banking Integration - Phòng Khám Tống Gia Đường

Hệ thống thanh toán QR Code tuân thủ tiêu chuẩn VietQR của Việt Nam, hỗ trợ thanh toán qua 55+ ngân hàng Việt Nam.

## 🏦 Tính năng chính

### ✅ Tuân thủ tiêu chuẩn VietQR
- Định dạng EMV QR Code theo tiêu chuẩn NAPAS
- Hỗ trợ tất cả ngân hàng Việt Nam (VietinBank, Vietcombank, ACB, MBBank, v.v.)
- Mã hóa TLV (Tag-Length-Value) chuẩn quốc tế
- Checksum CRC16 đảm bảo tính toàn vẹn dữ liệu

### 🔐 Bảo mật cao
- Xác thực người dùng qua NextAuth
- Mã hóa thông tin thanh toán
- Xử lý server-side bảo mật
- Không lưu trữ thông tin ngân hàng nhạy cảm

### 🎯 Tối ưu cho phòng khám
- Tích hợp với hệ thống quản lý đơn hàng
- Hiển thị thông tin khách hàng và sản phẩm
- Tự động tính toán tổng tiền
- Theo dõi trạng thái thanh toán

## 🚀 Cách sử dụng

### Cho nhân viên phòng khám:

1. **Tạo QR thanh toán**:
   - Vào trang "Đơn hàng"
   - Chọn đơn hàng chưa thanh toán
   - Nhấn biểu tượng QR Code
   - Hiển thị QR cho khách hàng quét

2. **Hướng dẫn khách hàng**:
   - Mở ứng dụng ngân hàng trên điện thoại
   - Chọn "Thanh toán QR" hoặc "Chuyển khoản"
   - Quét mã QR hiển thị
   - Kiểm tra thông tin và xác nhận

3. **Xác nhận thanh toán**:
   - Sau khi khách hàng chuyển khoản
   - Nhấn "Xác nhận đã thanh toán"
   - Hệ thống cập nhật trạng thái tự động

### Cho khách hàng:

1. **Ứng dụng ngân hàng hỗ trợ (15 ngân hàng)**:
   - VietinBank iPay, VCB Digibank, BIDV SmartBanking
   - Agribank E-Mobile, OCB OMNI, MB Bank
   - Techcombank Mobile, ACB Mobile, VPBank Neo
   - TPBank Mobile, Sacombank Pay, HDBank Mobile
   - VietCapital Mobile, SCB Mobile, MyVIB
   - Và tất cả app ngân hàng Việt Nam hỗ trợ VietQR

2. **Quy trình thanh toán**:
   - Quét QR code tại quầy
   - Kiểm tra thông tin thanh toán
   - Nhập mã PIN/sinh trắc học
   - Xác nhận giao dịch
   - Báo cho nhân viên khi hoàn tất

## ⚙️ Cấu hình hệ thống

### 1. Biến môi trường (.env.local)

```bash
# Thông tin ngân hàng phòng khám
CLINIC_BANK_BIN=970415  # Mã BIN ngân hàng (VietinBank)
CLINIC_ACCOUNT_NUMBER=1234567890123456  # Số tài khoản
CLINIC_ACCOUNT_NAME=PHONG KHAM TONG GIA DUONG  # Tên tài khoản
CLINIC_NAME_DISPLAY=Phòng Khám Tống Gia Đường  # Tên hiển thị
```

### 2. Mã BIN các ngân hàng được hỗ trợ

| STT | Ngân hàng | Tên đầy đủ | Mã ngắn | Mã BIN | Tên app |
|-----|-----------|------------|---------|--------|---------|
| 1 | VietinBank | Ngân hàng TMCP Công thương Việt Nam | ICB | 970415 | VietinBank iPay |
| 2 | Vietcombank | Ngân hàng TMCP Ngoại Thương Việt Nam | VCB | 970436 | VCB Digibank |
| 3 | BIDV | Ngân hàng TMCP Đầu tư và Phát triển Việt Nam | BIDV | 970418 | BIDV SmartBanking |
| 4 | Agribank | Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam | VBA | 970405 | Agribank E-Mobile |
| 5 | OCB | Ngân hàng TMCP Phương Đông | OCB | 970448 | OCB OMNI |
| 6 | MBBank | Ngân hàng TMCP Quân đội | MB | 970422 | MB Bank |
| 7 | Techcombank | Ngân hàng TMCP Kỹ thương Việt Nam | TCB | 970407 | Techcombank Mobile |
| 8 | ACB | Ngân hàng TMCP Á Châu | ACB | 970416 | ACB Mobile |
| 9 | VPBank | Ngân hàng TMCP Việt Nam Thịnh Vượng | VPB | 970432 | VPBank Neo |
| 10 | TPBank | Ngân hàng TMCP Tiên Phong | TPB | 970423 | TPBank Mobile |
| 11 | Sacombank | Ngân hàng TMCP Sài Gòn Thương Tín | STB | 970403 | Sacombank Pay |
| 12 | HDBank | Ngân hàng TMCP Phát triển TP.HCM | HDB | 970437 | HDBank Mobile |
| 13 | VietCapitalBank | Ngân hàng TMCP Bản Việt | VCCB | 970454 | VietCapital Mobile |
| 14 | SCB | Ngân hàng TMCP Sài Gòn | SCB | 970429 | SCB Mobile |
| 15 | VIB | Ngân hàng TMCP Quốc tế Việt Nam | VIB | 970441 | MyVIB |

## 🔧 Cấu trúc kỹ thuật

### 1. API Endpoints

- `POST /api/generate-payment-qr`: Tạo QR code thanh toán
- Xử lý dữ liệu đơn hàng và tạo mã VietQR chuẩn
- Trả về base64 image hoặc URL QR code

### 2. Components

- `VietQRPayment.tsx`: Component chính hiển thị QR
- Tích hợp countdown timer, trạng thái thanh toán
- Hỗ trợ regenerate QR, copy mã giao dịch

### 3. Utilities

- `utils/vietqr.ts`: Xử lý logic VietQR
- Hàm tạo mã QR theo chuẩn EMV
- Validation ngân hàng và tài khoản
- Format tiền tệ và text Tiếng Việt

## 🛡️ Bảo mật & Tuân thủ

### Yêu cầu pháp lý Việt Nam:
- ✅ Tuân thủ chuẩn VietQR của NAPAS
- ✅ Hỗ trợ sinh trắc học cho giao dịch >10 triệu VND
- ✅ Mã hóa thông tin theo ISO-20022
- ✅ Bảo vệ dữ liệu cá nhân (PDPL 2026)

### Biện pháp bảo mật:
- Xử lý server-side tránh lộ thông tin
- Validation đầu vào chống SQL injection
- Rate limiting API tránh spam
- Không lưu trữ thông tin ngân hàng

## 🔍 Troubleshooting

### Lỗi thường gặp:

1. **QR không quét được**:
   - Kiểm tra kích thước QR (tối thiểu 2x2cm)
   - Đảm bảo độ tương phản cao
   - Thử các app ngân hàng khác

2. **Thông tin ngân hàng sai**:
   - Kiểm tra biến môi trường
   - Xác minh mã BIN ngân hàng
   - Đảm bảo số tài khoản đúng định dạng

3. **API không hoạt động**:
   - Kiểm tra NextAuth authentication
   - Xem logs console cho lỗi chi tiết
   - Đảm bảo TypeScript build thành công

### Debug mode:

```bash
# Chạy development server để xem logs
npm run dev

# Kiểm tra build production
npm run build
```

## 📞 Hỗ trợ

Liên hệ team phát triển khi gặp vấn đề:
- Lỗi kỹ thuật: Kiểm tra console logs
- Vấn đề ngân hàng: Liên hệ ngân hàng của phòng khám
- Cập nhật tính năng: Tạo GitHub issue

---

**Lưu ý**: Hệ thống này tuân thủ đầy đủ quy định của Ngân hàng Nhà nước Việt Nam về thanh toán QR Code và bảo mật thông tin tài chính.