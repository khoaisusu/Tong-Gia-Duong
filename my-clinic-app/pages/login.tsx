import React from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { HeartIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push('/');
    }
  }, [session, router]);

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center">
              <HeartIcon className="w-12 h-12 text-primary-700" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary-900">Tống Gia Đường</h1>
          <p className="text-lg text-primary-700 mt-2">Phòng khám xoa bóp bấm huyệt cổ truyền</p>
          <p className="text-sm text-gray-600 mt-1">Bác sỹ Lực</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-900 text-center mb-6">
            Đăng nhập hệ thống
          </h2>

          {/* Error message if any */}
          {router.query.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                {router.query.error === 'OAuthSignin' 
                  ? 'Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại.'
                  : router.query.error === 'OAuthCallback'
                  ? 'Có lỗi trong quá trình xác thực. Vui lòng thử lại.'
                  : router.query.error === 'AccessDenied'
                  ? 'Tài khoản của bạn không có quyền truy cập hệ thống.'
                  : 'Đã xảy ra lỗi. Vui lòng thử lại.'}
              </p>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
              <path fill="none" d="M1 1h22v22H1z" />
            </svg>
            <span className="text-gray-700 font-medium">Đăng nhập với Google</span>
          </button>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900 font-medium mb-2">Lưu ý:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Chỉ nhân viên được cấp quyền mới có thể đăng nhập</li>
              <li>• Sử dụng email công ty đã được đăng ký</li>
              <li>• Liên hệ quản trị viên nếu không thể đăng nhập</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            © 2024 Phòng khám Tống Gia Đường. All rights reserved.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Version 2.0.0 | Developed by Bác sỹ Lực
          </p>
        </div>
      </div>
    </div>
  );
}