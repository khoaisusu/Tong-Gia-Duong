// Mapping giữa tiêu đề cột Google Sheets (tiếng Việt có dấu) và field trong code (camelCase không dấu)

export const mappingKhachHang = {
  "Mã KH": "maKhachHang",
  "Họ và tên ": "hoVaTen",
  "Tên thường gọi": "tenThuongGoi",
  "Số điện thoại": "soDienThoai",
  "Email": "email",
  "Ngày sinh": "ngaySinh",
  "Giới tính": "gioiTinh",
  "Địa chỉ": "diaChi",
  "Tiền sử bệnh": "tienSuBenh",
  "Ghi chú": "ghiChu",
  "Ngày tạo": "ngayTao",
  "Trạng thái ": "trangThai",
  "Người giới thiệu": "nguoiGioiThieu"
} as const;

export const mappingSanPham = {
  "Mã SP": "maSanPham",
  "Tên sản phẩm": "tenSanPham",
  "Loại sản phẩm": "loaiSanPham",
  "Đơn vị": "donVi",
  "Giá nhập": "giaNhap",
  "Giá bán": "giaBan",
  "Số lượng tồn": "soLuongTon",
  "Mô tả": "moTa",
  "Trạng thái": "trangThai"
} as const;

export const mappingDichVu = {
  "Mã DV": "maDichVu",
  "Tên dịch vụ": "tenDichVu",
  "Loại dịch vụ": "loaiDichVu",
  "Thời gian": "thoiGian",
  "Giá dịch vụ": "giaDichVu",
  "Mô tả": "moTa",
  "Lợi ích": "loiIch",
  "Trạng thái": "trangThai"
} as const;

export const mappingDonHang = {
  "Mã đơn": "maDonHang",
  "Mã KH": "maKhachHang",
  "Tên khách hàng": "tenKhachHang",
  "Ngày tạo": "ngayTao",
  "Danh sách sản phẩm": "danhSachSanPham",
  "Tổng tiền": "tongTien",
  "Giảm giá": "giamGia",
  "Thành tiền": "thanhTien",
  "Phương thức thanh toán": "phuongThucThanhToan",
  "Trạng thái thanh toán": "trangThaiThanhToan",
  "Ghi chú": "ghiChu",
  "Nhân viên tạo": "nhanVienTao"
} as const;

export const mappingLieuTrinh = {
  "Mã liệu trình": "maLieuTrinh",
  "Mã KH": "maKhachHang",
  "Tên khách hàng": "tenKhachHang",
  "Tên liệu trình": "tenLieuTrinh",
  "Ngày bắt đầu": "ngayBatDau",
  "Ngày kết thúc": "ngayKetThuc",
  "Danh sách dịch vụ": "danhSachDichVu",
  "Danh sách sản phẩm": "danhSachSanPham",
  "Số buổi": "soBuoi",
  "Số buổi đã thực hiện": "soBuoiDaThucHien",
  "Tổng tiền": "tongTien",
  "Đã thanh toán": "daThanhToan",
  "Còn lại": "conLai",
  "Trạng thái thanh toán": "trangThaiThanhToan",
  "Trạng thái": "trangThai",
  "Ghi chú": "ghiChu",
  "Nhân viên tư vấn": "nhanVienTuVan"
} as const;

export const mappingLuotTriLieu = {
  "Mã lượt": "maLuot",
  "Mã liệu trình": "maLieuTrinh",
  "Mã KH": "maKhachHang",
  "Tên khách hàng": "tenKhachHang",
  "Ngày thực hiện": "ngayThucHien",
  "Giờ bắt đầu": "gioBatDau",
  "Giờ kết thúc": "gioKetThuc",
  "Dịch vụ thực hiện": "dichVuThucHien",
  "Nhân viên thực hiện": "nhanVienThucHien",
  "Đánh giá": "danhGia",
  "Ghi chú": "ghiChu",
  "Trạng thái": "trangThai"
} as const;

export const mappingNhanVien = {
  "Mã NV": "maNhanVien",
  "Họ và tên": "hoVaTen",
  "Số điện thoại": "soDienThoai",
  "Email": "email",
  "Chức vụ": "chucVu",
  "Chuyên môn": "chuyenMon",
  "Ngày vào làm": "ngayVaoLam",
  "Quyền hạn": "quyenHan",
  "Trạng thái": "trangThai",
  "Hoa hồng %": "hoaHong",
  "Ngân hàng": "nganHang",
  "Số TK": "soTK"
} as const;

export const mappingGiaoDich = {
  "Mã GD": "maGiaoDich",
  "Loại GD": "loaiGiaoDich",
  "Mã tham chiếu": "maThamChieu",
  "Mã KH": "maKhachHang",
  "Tên khách hàng": "tenKhachHang",
  "Số tiền": "soTien",
  "Phương thức": "phuongThuc",
  "Ngày GD": "ngayGiaoDich",
  "Nội dung": "noiDung",
  "Trạng thái": "trangThai",
  "Nhân viên xử lý": "nhanVienXuLy"
} as const;


// Helper functions
export function mapRowToObject<T extends Record<string, string>>(
  headers: string[],
  row: string[],
  mapping: T
): Record<T[keyof T], string> {
  const obj: any = {};

  headers.forEach((header, index) => {
    const field = mapping[header as keyof T];
    if (field) {
      let value = row[index] || '';

      // Xử lý số điện thoại: thêm số 0 đầu nếu thiếu
      if (field === 'soDienThoai' && value) {
        // Loại bỏ khoảng trắng và ký tự không cần thiết
        value = value.toString().replace(/\s/g, '');

        // Nếu số điện thoại Việt Nam bắt đầu bằng 84, thay thế bằng 0
        if (value.startsWith('84') && value.length === 11) {
          value = '0' + value.substring(2);
        }
        // Nếu số có 9 chữ số và không bắt đầu bằng 0, thêm 0 vào đầu
        else if (value.length === 9 && !value.startsWith('0')) {
          value = '0' + value;
        }
      }

      obj[field] = value;
    }
  });

  return obj;
}

export function mapObjectToRow<T extends Record<string, string>>(
  obj: Record<string, any>,
  mapping: T
): string[] {
  const headers = Object.keys(mapping);
  return headers.map(header => {
    const field = mapping[header as keyof T];
    return obj[field as string] || '';
  });
}

// Type definitions
export type KhachHang = {
  maKhachHang: string;
  hoVaTen: string;
  tenThuongGoi: string;
  soDienThoai: string;
  email: string;
  ngaySinh: string;
  gioiTinh: string;
  diaChi: string;
  tienSuBenh: string;
  ghiChu: string;
  ngayTao: string;
  trangThai: string;
  nguoiGioiThieu: string;
};

export type SanPham = {
  maSanPham: string;
  tenSanPham: string;
  loaiSanPham: string;
  donVi: string;
  giaNhap: string;
  giaBan: string;
  soLuongTon: string;
  moTa: string;
  trangThai: string;
};

export type DichVu = {
  maDichVu: string;
  tenDichVu: string;
  loaiDichVu: string;
  thoiGian: string;
  giaDichVu: string;
  moTa: string;
  loiIch: string;
  trangThai: string;
};

export type DonHang = {
  maDonHang: string;
  maKhachHang: string;
  tenKhachHang: string;
  ngayTao: string;
  danhSachSanPham: string;
  tongTien: string;
  giamGia: string;
  thanhTien: string;
  phuongThucThanhToan: string;
  trangThaiThanhToan: string;
  ghiChu: string;
  nhanVienTao: string;
};

export type LieuTrinh = {
  maLieuTrinh: string;
  maKhachHang: string;
  tenKhachHang: string;
  tenLieuTrinh: string;
  ngayBatDau: string;
  ngayKetThuc: string;
  danhSachDichVu: string;
  danhSachSanPham: string;
  soBuoi: string;
  soBuoiDaThucHien: string;
  tongTien: string;
  daThanhToan: string;
  conLai: string;
  trangThaiThanhToan: string;
  trangThai: string;
  ghiChu: string;
  nhanVienTuVan: string;
};

export type LuotTriLieu = {
  maLuot: string;
  maLieuTrinh: string;
  maKhachHang: string;
  tenKhachHang: string;
  ngayThucHien: string;
  gioBatDau: string;
  gioKetThuc: string;
  dichVuThucHien: string;
  nhanVienThucHien: string;
  danhGia: string;
  ghiChu: string;
  trangThai: string;
};

export type NhanVien = {
  maNhanVien: string;
  hoVaTen: string;
  soDienThoai: string;
  email: string;
  chucVu: string;
  chuyenMon: string;
  ngayVaoLam: string;
  quyenHan: string;
  trangThai: string;
  hoaHong: string;
  nganHang: string;
  soTK: string;
};

export type GiaoDich = {
  maGiaoDich: string;
  loaiGiaoDich: string;
  maThamChieu: string;
  maKhachHang: string;
  tenKhachHang: string;
  soTien: string;
  phuongThuc: string;
  ngayGiaoDich: string;
  noiDung: string;
  trangThai: string;
  nhanVienXuLy: string;
};

