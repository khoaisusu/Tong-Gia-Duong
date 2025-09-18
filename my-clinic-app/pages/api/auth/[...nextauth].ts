import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getAllRows } from "../../../utils/googleSheets";
import { SHEETS } from "../../../utils/googleSheets";
import { mappingNhanVien } from "../../../utils/columnMapping";

// Validate required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  console.error('❌ NEXTAUTH_SECRET is required but not set');
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

if (!process.env.GOOGLE_CLIENT_ID) {
  console.error('❌ GOOGLE_CLIENT_ID is required but not set');
  throw new Error('GOOGLE_CLIENT_ID environment variable is required');
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
  console.error('❌ GOOGLE_CLIENT_SECRET is required but not set');
  throw new Error('GOOGLE_CLIENT_SECRET environment variable is required');
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Cho phép admin đăng nhập trực tiếp
      if (user.email === 'doctorluchuong@gmail.com') {
        return true;
      }

      // Kiểm tra email có trong danh sách nhân viên không
      try {
        // Check if required Google Sheets environment variables are set
        if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
            !process.env.GOOGLE_PRIVATE_KEY ||
            !process.env.GOOGLE_SHEET_ID) {
          console.error('❌ Google Sheets environment variables missing for staff check');
          return true;
        }

        const nhanVienList = await getAllRows(SHEETS.NHAN_VIEN, mappingNhanVien);
        const nhanVien = nhanVienList.find(nv => nv.email === user.email);

        if (!nhanVien) {
          console.log('❌ Email not found in staff list:', user.email);
          return false;
        }

        if (nhanVien.trangThai !== 'Hoạt động') {
          console.log('❌ Staff account inactive:', user.email);
          return false;
        }

        return true;
      } catch (error) {
        console.error('❌ Error checking staff authorization:', error);
        return true;
      }
    },
    
    async session({ session, token }) {
      // Thêm thông tin nhân viên vào session
      if (session.user?.email) {
        // Admin mặc định
        if (session.user.email === 'doctorluchuong@gmail.com') {
          session.user = {
            ...session.user,
            id: 'ADMIN001',
            name: 'Bác sỹ Lực',
            role: 'Admin',
            position: 'Bác sỹ',
            specialization: 'Xoa bóp bấm huyệt',
          };
          return session;
        }
        
        try {
          const nhanVienList = await getAllRows(SHEETS.NHAN_VIEN, mappingNhanVien);
          const nhanVien = nhanVienList.find(nv => nv.email === session.user?.email);
          
          if (nhanVien) {
            session.user = {
              ...session.user,
              id: nhanVien.maNhanVien,
              name: nhanVien.hoVaTen,
              role: nhanVien.quyenHan,
              position: nhanVien.chucVu,
              specialization: nhanVien.chuyenMon,
            };
          }
        } catch (error) {
          console.error('Error fetching staff info:', error);
        }
      }
      
      return session;
    },
    
    async jwt({ token, user, account }) {
      if (account && user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);