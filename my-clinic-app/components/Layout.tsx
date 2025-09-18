import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import {
  HomeIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  UsersIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  HeartIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const menuItems = [
  { href: '/', label: 'Tổng quan', icon: HomeIcon },
  { href: '/khach-hang', label: 'Khách hàng', icon: UserGroupIcon },
  { href: '/san-pham', label: 'Sản phẩm', icon: ShoppingBagIcon },
  { href: '/dich-vu', label: 'Dịch vụ', icon: SparklesIcon },
  { href: '/don-hang', label: 'Đơn hàng', icon: ClipboardDocumentListIcon },
  { href: '/lieu-trinh', label: 'Liệu trình', icon: HeartIcon },
  { href: '/lich-hen', label: 'Lịch hẹn', icon: CalendarDaysIcon },
  { href: '/nhan-vien', label: 'Nhân viên', icon: UsersIcon },
  { href: '/bao-cao', label: 'Báo cáo', icon: CurrencyDollarIcon },
  { href: '/cai-dat', label: 'Cài đặt', icon: Cog6ToothIcon },
];

export default function Layout({ children, title }: LayoutProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') {
      return router.pathname === href;
    }
    return router.pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => {
    // Admin có quyền truy cập tất cả
    if (session?.user?.role === 'Admin') return true;
    
    // Nhân viên không được truy cập một số trang
    const restrictedPaths = ['/nhan-vien', '/bao-cao', '/cai-dat'];
    return !restrictedPaths.includes(item.href);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-primary-700 to-primary-800 shadow-lg transform transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center">
              <HeartIcon className="w-8 h-8 text-white" />
              {!sidebarCollapsed && (
                <div className="ml-2">
                  <h1 className="text-lg font-bold text-white">Tống Gia Đường</h1>
                  <p className="text-xs text-primary-200">Phòng khám Bác sỹ Lực</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:text-primary-200"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    active
                      ? 'bg-white bg-opacity-20 text-white'
                      : 'text-primary-200 hover:bg-white hover:bg-opacity-10 hover:text-white'
                  } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  title={sidebarCollapsed ? item.label : ''}
                >
                  <Icon className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                  {!sidebarCollapsed && item.label}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-4">
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {session?.user?.name?.[0] || 'U'}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-primary-200 hover:text-white transition-colors"
                  title="Đăng xuất"
                >
                  <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {session?.user?.name?.[0] || 'U'}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-white">
                    {session?.user?.name || 'Người dùng'}
                  </p>
                  <p className="text-xs text-primary-200">
                    {session?.user?.position || session?.user?.role || 'Nhân viên'}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="ml-2 p-2 text-primary-200 hover:text-white transition-colors"
                  title="Đăng xuất"
                >
                  <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      }`}>
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-md lg:hidden"
              >
                <Bars3Icon className="w-6 h-6 text-gray-600" />
              </button>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-md hidden lg:block mr-2 hover:bg-gray-100"
              >
                <Bars3Icon className="w-6 h-6 text-gray-600" />
              </button>
              <h2 className="text-xl font-semibold text-gray-800">
                {title || 'Tổng quan'}
              </h2>
            </div>
            
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white py-4 px-6">
          <div className="text-center text-sm text-gray-600">
            © 2025 Phòng khám Tống Gia Đường
          </div>
        </footer>
      </div>
    </div>
  );
}