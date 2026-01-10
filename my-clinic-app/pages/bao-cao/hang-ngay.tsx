import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import Link from 'next/link';
import {
    CalendarDaysIcon,
    ClockIcon,
    UserIcon,
    ChartBarIcon,
    ArrowLeftIcon,
    PrinterIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

interface TreatmentSession {
    maLuot: string;
    maLieuTrinh: string;
    maKhachHang: string;
    tenKhachHang: string;
    ngayThucHien: string;
    gioBatDau: string;
    gioKetThuc: string;
    dichVuThucHien: string;
    nhanVienThucHien: string;
    nguoiChinh: string;
    trangThai: string;
    ghiChu: string;
}

export default function BaoCaoHangNgayPage() {
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );

    // Fetch treatment sessions
    const { data: sessions = [], isLoading } = useQuery({
        queryKey: ['daily-report-sessions', selectedDate],
        queryFn: async () => {
            const res = await fetch('/api/luot-tri-lieu');
            if (!res.ok) throw new Error('Failed to fetch sessions');
            const data = await res.json();

            // Filter by selected date
            return data.filter((s: TreatmentSession) => {
                if (!s.ngayThucHien) return false;
                const sessionDate = new Date(s.ngayThucHien).toISOString().split('T')[0];
                return sessionDate === selectedDate;
            }).sort((a: TreatmentSession, b: TreatmentSession) => {
                return (a.gioBatDau || '00:00').localeCompare(b.gioBatDau || '00:00');
            });
        },
    });

    // Calculate statistics
    const stats = {
        total: sessions.length,
        completed: sessions.filter((s: TreatmentSession) => s.trangThai === 'Hoàn thành').length,
        pending: sessions.filter((s: TreatmentSession) => s.trangThai === 'Đã lên lịch' || s.trangThai === 'Chờ').length,
        cancelled: sessions.filter((s: TreatmentSession) => s.trangThai === 'Đã hủy').length,
    };

    // Get unique services with count
    const servicesSummary = sessions.reduce((acc: { [key: string]: number }, s: TreatmentSession) => {
        const service = s.dichVuThucHien || 'Không xác định';
        acc[service] = (acc[service] || 0) + 1;
        return acc;
    }, {});

    // Get staff summary with count
    const staffSummary = sessions.reduce((acc: { [key: string]: { count: number, completed: number } }, s: TreatmentSession) => {
        const staff = s.nhanVienThucHien || 'Chưa phân công';
        if (!acc[staff]) {
            acc[staff] = { count: 0, completed: 0 };
        }
        acc[staff].count += 1;
        if (s.trangThai === 'Hoàn thành') {
            acc[staff].completed += 1;
        }
        return acc;
    }, {});

    // Get supervisor summary
    const supervisorSummary = sessions.reduce((acc: { [key: string]: number }, s: TreatmentSession) => {
        const supervisor = s.nguoiChinh || '';
        if (supervisor) {
            acc[supervisor] = (acc[supervisor] || 0) + 1;
        }
        return acc;
    }, {});

    // Quick date navigation
    const goToDate = (offset: number) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + offset);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const goToToday = () => {
        setSelectedDate(new Date().toISOString().split('T')[0]);
    };

    // Format date for display
    const formatDisplayDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        if (dateStr === today) return 'Hôm nay';
        if (dateStr === yesterday) return 'Hôm qua';
        if (dateStr === tomorrow) return 'Ngày mai';

        return date.toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Hoàn thành':
                return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
            case 'Đã hủy':
                return <XCircleIcon className="w-5 h-5 text-red-600" />;
            default:
                return <ExclamationCircleIcon className="w-5 h-5 text-yellow-600" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Hoàn thành':
                return 'bg-green-100 text-green-800';
            case 'Đã hủy':
                return 'bg-red-100 text-red-800';
            case 'Đã lên lịch':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-yellow-100 text-yellow-800';
        }
    };

    return (
        <Layout title="Báo cáo hàng ngày">
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/bao-cao"
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                            </Link>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Báo cáo hàng ngày</h2>
                                <p className="text-sm text-gray-600">{formatDisplayDate(selectedDate)}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Date navigation */}
                            <button
                                onClick={() => goToDate(-1)}
                                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                            >
                                ← Trước
                            </button>

                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                                <CalendarDaysIcon className="w-5 h-5 text-gray-500" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-transparent border-none text-sm font-medium text-gray-900 focus:outline-none"
                                />
                            </div>

                            <button
                                onClick={() => goToDate(1)}
                                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                            >
                                Sau →
                            </button>

                            <button
                                onClick={goToToday}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                            >
                                Hôm nay
                            </button>

                            <button
                                onClick={() => window.print()}
                                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                            >
                                <PrinterIcon className="w-4 h-4 mr-2" />
                                In
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Tổng lịch hẹn</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                            </div>
                            <CalendarDaysIcon className="w-8 h-8 text-blue-600" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Hoàn thành</p>
                                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                            </div>
                            <CheckCircleIcon className="w-8 h-8 text-green-600" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Chờ thực hiện</p>
                                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                            </div>
                            <ClockIcon className="w-8 h-8 text-yellow-600" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Đã hủy</p>
                                <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
                            </div>
                            <XCircleIcon className="w-8 h-8 text-red-600" />
                        </div>
                    </div>
                </div>

                {/* Appointments Table */}
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Chi tiết lịch hẹn</h3>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <CalendarDaysIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>Không có lịch hẹn nào trong ngày này</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Giờ
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Khách hàng
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Dịch vụ
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Nhân viên
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Người chỉnh
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Trạng thái
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Ghi chú
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {sessions.map((session: TreatmentSession) => (
                                        <tr key={session.maLuot} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <ClockIcon className="w-4 h-4 text-gray-400 mr-2" />
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {session.gioBatDau || '--:--'}
                                                    </span>
                                                    {session.gioKetThuc && (
                                                        <span className="text-sm text-gray-500 ml-1">
                                                            - {session.gioKetThuc}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {session.tenKhachHang || 'Không xác định'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-gray-900 max-w-xs truncate" title={session.dichVuThucHien}>
                                                    {session.dichVuThucHien || 'Không có'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <UserIcon className="w-4 h-4 text-gray-400 mr-2" />
                                                    <span className="text-sm text-gray-900">
                                                        {session.nhanVienThucHien || 'Chưa phân công'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="text-sm text-gray-900">
                                                    {session.nguoiChinh || '-'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.trangThai)}`}>
                                                    {getStatusIcon(session.trangThai)}
                                                    <span className="ml-1">{session.trangThai || 'Không xác định'}</span>
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-gray-500 max-w-xs truncate" title={session.ghiChu}>
                                                    {session.ghiChu || '-'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Summary Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Services Summary */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <ChartBarIcon className="w-5 h-5 mr-2 text-primary-600" />
                            Dịch vụ sử dụng
                        </h3>
                        {Object.keys(servicesSummary).length === 0 ? (
                            <p className="text-sm text-gray-500">Không có dữ liệu</p>
                        ) : (
                            <div className="space-y-3">
                                {Object.entries(servicesSummary)
                                    .sort(([, a], [, b]) => (b as number) - (a as number))
                                    .map(([service, count]) => (
                                        <div key={service} className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700 truncate flex-1 mr-2" title={service}>
                                                {service}
                                            </span>
                                            <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                                                {count as number} lượt
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* Staff Summary */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <UserIcon className="w-5 h-5 mr-2 text-blue-600" />
                            Nhân viên thực hiện
                        </h3>
                        {Object.keys(staffSummary).length === 0 ? (
                            <p className="text-sm text-gray-500">Không có dữ liệu</p>
                        ) : (
                            <div className="space-y-3">
                                {Object.entries(staffSummary)
                                    .sort(([, a], [, b]) => (b as { count: number }).count - (a as { count: number }).count)
                                    .map(([staff, data]) => {
                                        const { count, completed } = data as { count: number, completed: number };
                                        return (
                                            <div key={staff} className="flex items-center justify-between">
                                                <span className="text-sm text-gray-700">{staff}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                                        {count} lượt
                                                    </span>
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                                        {completed} xong
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>

                    {/* Supervisor Summary */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <UserIcon className="w-5 h-5 mr-2 text-purple-600" />
                            Người chỉnh (Quản lý)
                        </h3>
                        {Object.keys(supervisorSummary).length === 0 ? (
                            <p className="text-sm text-gray-500">Không có dữ liệu</p>
                        ) : (
                            <div className="space-y-3">
                                {Object.entries(supervisorSummary)
                                    .sort(([, a], [, b]) => (b as number) - (a as number))
                                    .map(([supervisor, count]) => (
                                        <div key={supervisor} className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700">{supervisor}</span>
                                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                                {count as number} lượt
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
