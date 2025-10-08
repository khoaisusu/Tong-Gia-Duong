import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import {
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  PlusIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { KhachHang, DichVu, NhanVien, LuotTriLieu, LieuTrinh } from '../../utils/columnMapping';

interface Appointment {
  id: string;
  customerName: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  duration: number;
  staff: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  treatmentId?: string;
}

export default function LichHenPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Cancel appointment mutation
  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const res = await fetch('/api/luot-tri-lieu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maLuot: appointmentId,
          trangThai: 'Hủy'
        })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to cancel appointment');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatment-sessions'] });
      toast.success('Đã hủy lịch hẹn thành công!');
      setSelectedAppointment(null);
    },
    onError: (error: Error) => {
      toast.error(`Lỗi: ${error.message}`);
    }
  });

  // Complete appointment mutation
  const completeAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const res = await fetch('/api/luot-tri-lieu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maLuot: appointmentId,
          trangThai: 'Hoàn thành'
        })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to complete appointment');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatment-sessions'] });
      toast.success('Đã hoàn thành lịch hẹn!');
      setSelectedAppointment(null);
    },
    onError: (error: Error) => {
      toast.error(`Lỗi: ${error.message}`);
    }
  });

  const handleCancelAppointment = (appointment: Appointment) => {
    if (window.confirm(`Bạn có chắc muốn hủy lịch hẹn của ${appointment.customerName}?`)) {
      cancelAppointmentMutation.mutate(appointment.id);
    }
  };

  const handleCompleteAppointment = (appointment: Appointment) => {
    if (window.confirm(`Bạn có chắc muốn đánh dấu hoàn thành lịch hẹn của ${appointment.customerName}?`)) {
      completeAppointmentMutation.mutate(appointment.id);
    }
  };

  // Fetch treatment sessions (lượt trị liệu) as appointments
  const { data: treatmentSessions = [], isLoading } = useQuery({
    queryKey: ['treatment-sessions'],
    queryFn: async () => {
      const res = await fetch('/api/luot-tri-lieu');
      if (!res.ok) throw new Error('Failed to fetch treatment sessions');
      return res.json();
    },
  });

  // Fetch customers for phone number lookup
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch('/api/khach-hang');
      if (!res.ok) throw new Error('Failed to fetch customers');
      return res.json();
    },
  });

  // Fetch services for service name lookup
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await fetch('/api/dich-vu');
      if (!res.ok) throw new Error('Failed to fetch services');
      return res.json();
    },
  });

  // Convert treatment sessions to appointment format
  const appointments: Appointment[] = treatmentSessions
    .map((session: LuotTriLieu) => {
      // Find customer phone number
      const customer = customers.find((c: KhachHang) => c.maKhachHang === session.maKhachHang);

      // Get service name from service code
      const getServiceName = (serviceCode: string): string => {
        if (!serviceCode) return '';

        // Try to find the service by code
        const service = services.find((s: DichVu) => s.maDichVu === serviceCode);
        return service?.tenDichVu || serviceCode; // Return service name or fallback to code
      };

      return {
        id: session.maLuot,
        customerName: session.tenKhachHang,
        phone: customer?.soDienThoai || '',
        service: getServiceName(session.dichVuThucHien),
        date: session.ngayThucHien,
        time: session.gioBatDau,
        duration: calculateDuration(session.gioBatDau, session.gioKetThuc),
        staff: session.nhanVienThucHien,
        status: mapSessionStatus(session.trangThai),
        notes: session.ghiChu || '',
        treatmentId: session.maLieuTrinh,
      };
    })
    .filter((appointment: Appointment, index: number, self: Appointment[]) =>
      // Remove duplicates by keeping only first occurrence of each ID
      index === self.findIndex((a: Appointment) => a.id === appointment.id)
    );

  // Helper function to calculate duration
  function calculateDuration(startTime: string, endTime: string): number {
    if (!startTime || !endTime) return 60; // Default 60 minutes

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return endMinutes - startMinutes;
  }

  // Helper function to map session status to appointment status
  function mapSessionStatus(sessionStatus: string): Appointment['status'] {
    switch (sessionStatus) {
      case 'Hoàn thành': return 'completed';
      case 'Đã xác nhận': return 'confirmed';
      case 'Hủy': return 'cancelled';
      default: return 'scheduled';
    }
  }

  // Get week dates
  const getWeekDates = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const weekDates = getWeekDates(selectedDate);
  const timeSlots = Array.from({ length: 20 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  });

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate);
  };

  // Get appointments for a specific date and time
  const getAppointmentForSlot = (date: Date, time: string) => {
    // Format date as YYYY-MM-DD to match API data format
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    return appointments.find(apt => apt.date === dateStr && apt.time === time);
  };

  // Status colors
  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Today's statistics
  const today = new Date();
  const todayDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  const todayAppointments = appointments.filter(apt => apt.date === todayDate);

  // Selected date appointments (for day view)
  const selectedDateStr = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;
  const selectedDayAppointments = appointments.filter(apt => apt.date === selectedDateStr);
  const stats = {
    total: todayAppointments.length,
    confirmed: todayAppointments.filter(a => a.status === 'confirmed').length,
    scheduled: todayAppointments.filter(a => a.status === 'scheduled').length,
    completed: todayAppointments.filter(a => a.status === 'completed').length,
  };

  return (
    <Layout title="Lịch hẹn">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Lịch hẹn khám</h2>
              <p className="text-sm text-gray-600">
                {new Date().toLocaleDateString('vi-VN', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                {['day', 'week', 'month'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as any)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      viewMode === mode
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {mode === 'day' ? 'Ngày' : mode === 'week' ? 'Tuần' : 'Tháng'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setSelectedDate(new Date());
                  setViewMode('day');
                }}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors relative"
              >
                <CalendarDaysIcon className="w-5 h-5 mr-2" />
                Hôm nay
                {todayAppointments.length > 0 && (
                  <span className="ml-2 bg-white text-blue-600 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {todayAppointments.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowAppointmentForm(true)}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Thêm lịch hẹn
              </button>
            </div>
          </div>
        </div>

        {/* Today's Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng lịch hẹn hôm nay</p>
                <p className="text-2xl font-bold text-primary-700">{stats.total}</p>
              </div>
              <CalendarDaysIcon className="w-8 h-8 text-primary-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã xác nhận</p>
                <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chờ xác nhận</p>
                <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
              </div>
              <ClockIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã hoàn thành</p>
                <p className="text-2xl font-bold text-gray-600">{stats.completed}</p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Calendar View */}
        {viewMode === 'week' && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              
              <h3 className="text-lg font-medium">
                Tuần {weekDates[0].toLocaleDateString('vi-VN')} - {weekDates[6].toLocaleDateString('vi-VN')}
              </h3>
              
              <button
                onClick={() => navigateWeek('next')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b">
                      Giờ
                    </th>
                    {weekDates.map((date, index) => {
                      const isToday = date.toDateString() === new Date().toDateString();
                      const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                      
                      return (
                        <th
                          key={index}
                          className={`px-2 py-3 text-center text-xs font-medium uppercase border-b ${
                            isToday ? 'bg-primary-50 text-primary-700' : 'text-gray-500'
                          }`}
                        >
                          <div>{dayNames[date.getDay()]}</div>
                          <div className="text-lg font-semibold">{date.getDate()}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((time) => (
                    <tr key={time}>
                      <td className="px-2 py-2 text-sm text-gray-500 border-b border-r">
                        {time}
                      </td>
                      {weekDates.map((date, index) => {
                        const appointment = getAppointmentForSlot(date, time);
                        const isToday = date.toDateString() === new Date().toDateString();
                        
                        return (
                          <td
                            key={index}
                            className={`px-1 py-2 border-b border-r relative h-16 ${
                              isToday ? 'bg-primary-50/30' : ''
                            }`}
                          >
                            {appointment && (
                              <div
                                className={`absolute inset-1 p-1 rounded border cursor-pointer hover:shadow-md transition-shadow ${getStatusColor(appointment.status)}`}
                                onClick={() => setSelectedAppointment(appointment)}
                              >
                                <p className="text-xs font-medium truncate">
                                  {appointment.customerName}
                                </p>
                                <p className="text-xs truncate">
                                  {appointment.service}
                                </p>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Day View */}
        {viewMode === 'day' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                Lịch hẹn ngày {selectedDate.toLocaleDateString('vi-VN')}
              </h3>
              
              <div className="space-y-3">
                {selectedDayAppointments.length > 0 ? (
                  selectedDayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className={`p-4 rounded-lg border-2 ${getStatusColor(appointment.status)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <span className="text-lg font-semibold">{appointment.time}</span>
                            <span className="text-sm text-gray-600">
                              ({appointment.duration} phút)
                            </span>
                          </div>
                          
                          <h4 className="font-medium text-gray-900 mb-1">
                            {appointment.customerName}
                          </h4>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <PhoneIcon className="w-4 h-4" />
                              <span>{appointment.phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <HeartIcon className="w-4 h-4" />
                              <span>{appointment.service}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <UserIcon className="w-4 h-4" />
                              <span>{appointment.staff}</span>
                            </div>
                          </div>
                          
                          {appointment.notes && (
                            <p className="mt-2 text-sm text-gray-600 italic">
                              Ghi chú: {appointment.notes}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                            <button
                              onClick={() => {
                                // Open appointment details modal for completion
                                setSelectedAppointment(appointment);
                              }}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                              Hoàn thành
                            </button>
                          )}

                          {appointment.status === 'completed' && (
                            <div className="px-3 py-1 bg-gray-200 text-gray-600 text-sm rounded text-center">
                              Đã hoàn thành
                            </div>
                          )}

                          {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancelAppointment(appointment)}
                              disabled={cancelAppointmentMutation.isPending}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              {cancelAppointmentMutation.isPending ? 'Đang hủy...' : 'Hủy'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Không có lịch hẹn nào trong ngày này
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Appointment Form Modal */}
      {showAppointmentForm && (
        <AppointmentFormModal
          onClose={() => setShowAppointmentForm(false)}
          onSave={(appointmentDate?: Date) => {
            setShowAppointmentForm(false);
            // If appointment date is provided, navigate to that date
            if (appointmentDate) {
              setSelectedDate(appointmentDate);
              // Switch to day view to better show the new appointment
              setViewMode('day');
            }
          }}
        />
      )}

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <AppointmentDetailsModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
        />
      )}
    </Layout>
  );
}

function HeartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

// Appointment Form Modal
function AppointmentFormModal({ onClose, onSave }: any) {
  const queryClient = useQueryClient();
  const [selectedTreatmentPlan, setSelectedTreatmentPlan] = useState<LieuTrinh | null>(null);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('09:00');
  const [notes, setNotes] = useState('');
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [treatmentSearch, setTreatmentSearch] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<KhachHang | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize jQuery datepicker
  useEffect(() => {
    const initDatepicker = async () => {
      if (typeof window !== 'undefined') {
        try {
          const $ = (await import('jquery')).default;

          // Make jQuery global so datepicker can access it
          (window as any).jQuery = $;
          (window as any).$ = $;

          await import('jquery-ui/ui/widgets/datepicker');

          // Add jQuery UI CSS if not already added
          if (!document.getElementById('jquery-ui-css')) {
            const link = document.createElement('link');
            link.id = 'jquery-ui-css';
            link.rel = 'stylesheet';
            link.href = 'https://code.jquery.com/ui/1.13.2/themes/base/jquery-ui.css';
            document.head.appendChild(link);
          }

          // Set Vietnamese locale for datepicker
          $.datepicker.regional['vi'] = {
            closeText: 'Đóng',
            prevText: 'Trước',
            nextText: 'Sau',
            currentText: 'Hôm nay',
            monthNames: [
              'Tháng Một', 'Tháng Hai', 'Tháng Ba', 'Tháng Tư',
              'Tháng Năm', 'Tháng Sáu', 'Tháng Bảy', 'Tháng Tám',
              'Tháng Chín', 'Tháng Mười', 'Tháng Mười Một', 'Tháng Mười Hai'
            ],
            monthNamesShort: [
              'Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6',
              'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'
            ],
            dayNames: [
              'Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư',
              'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'
            ],
            dayNamesShort: [
              'CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'
            ],
            dayNamesMin: [
              'CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'
            ],
            weekHeader: 'Tu',
            dateFormat: 'dd/mm/yy',
            firstDay: 1,
            isRTL: false,
            showMonthAfterYear: false,
            yearSuffix: ''
          };
          $.datepicker.setDefaults($.datepicker.regional['vi']);

          // Initialize datepicker
          ($('#appointmentDatePicker') as any).datepicker({
            dateFormat: 'dd/mm/yy',
            minDate: 0,
            onSelect: function(dateText: string) {
              setAppointmentDate(dateText);
            }
          });
        } catch (error) {
          console.error('Error initializing datepicker:', error);
        }
      }
    };

    initDatepicker();

    return () => {
      if (typeof window !== 'undefined') {
        try {
          const $ = (window as any).$;
          if ($ && $('#appointmentDatePicker').length && ($('#appointmentDatePicker') as any).datepicker) {
            ($('#appointmentDatePicker') as any).datepicker('destroy');
          }
        } catch (error) {
          console.error('Error destroying datepicker:', error);
        }
      }
    };
  }, []);

  // Fetch treatment plans
  const { data: treatmentPlans = [] } = useQuery({
    queryKey: ['treatment-plans'],
    queryFn: async () => {
      const res = await fetch('/api/lieu-trinh');
      if (!res.ok) throw new Error('Failed to fetch treatment plans');
      return res.json();
    },
  });

  // Fetch staff
  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const res = await fetch('/api/nhan-vien');
      if (!res.ok) throw new Error('Failed to fetch staff');
      return res.json();
    },
  });

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch('/api/khach-hang');
      if (!res.ok) throw new Error('Failed to fetch customers');
      return res.json();
    },
  });

  // Filter treatment plans for search - only show active plans with services
  const filteredTreatmentPlans = treatmentPlans.filter((plan: LieuTrinh) => {
    // Only show treatment plans that have services (not empty, not [], not blank)
    const hasServices = plan.danhSachDichVu &&
                       plan.danhSachDichVu.trim() !== '' &&
                       plan.danhSachDichVu !== '[]' &&
                       plan.danhSachDichVu !== 'null';

    if (!hasServices) return false;

    // Filter out completed or cancelled treatment plans
    if (plan.trangThai === 'Hoàn thành' || plan.trangThai === 'Hủy') {
      return false;
    }

    // Filter out treatment plans that have reached maximum sessions
    const currentSessions = parseInt(plan.soBuoiDaThucHien || '0');
    const totalSessions = parseInt(plan.soBuoi || '0');
    if (currentSessions >= totalSessions) {
      return false;
    }

    // Also filter by search term
    return plan.tenLieuTrinh?.toLowerCase().includes(treatmentSearch.toLowerCase()) ||
           plan.maLieuTrinh?.toLowerCase().includes(treatmentSearch.toLowerCase()) ||
           plan.tenKhachHang?.toLowerCase().includes(treatmentSearch.toLowerCase());
  });

  // Filter customers for search
  const filteredCustomers = customers.filter((customer: KhachHang) =>
    customer.hoVaTen?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.soDienThoai?.includes(customerSearch) ||
    customer.maKhachHang?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (!selectedTreatmentPlan) {
        toast.error('Vui lòng chọn liệu trình!');
        return;
      }

      if (!appointmentDate || !appointmentTime) {
        toast.error('Vui lòng chọn ngày và giờ hẹn!');
        return;
      }

      // Parse date from dd/mm/yyyy format
      const dateParts = appointmentDate.split('/');
      if (dateParts.length !== 3) {
        toast.error('Định dạng ngày không hợp lệ! Vui lòng chọn lại.');
        return;
      }

      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed in JS Date
      const year = parseInt(dateParts[2]);

      const selectedDate = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        toast.error('Không thể đặt lịch hẹn trong quá khứ!');
        return;
      }

    // Validate time within working hours
    if (!appointmentTime) {
      toast.error('Vui lòng chọn giờ hẹn!');
      return;
    }

    const [hours, minutes] = appointmentTime.split(':').map(Number);
    if (hours < 7 || hours > 20 || (hours === 20 && minutes > 0)) {
      toast.error('Giờ hẹn phải trong khoảng 7:00 - 20:00!');
      return;
    }

    // Save to treatment sessions API
    const createAppointment = async () => {
      try {
        // Convert date from dd/mm/yyyy to yyyy-mm-dd for API
        const dateParts = appointmentDate.split('/');
        const formattedDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;

        // Get services from treatment plan (use first service for duration estimation)
        let primaryService = 'Điều trị';

        if (selectedTreatmentPlan.danhSachDichVu &&
            selectedTreatmentPlan.danhSachDichVu !== '[]' &&
            selectedTreatmentPlan.danhSachDichVu.trim() !== '') {
          try {
            const services = JSON.parse(selectedTreatmentPlan.danhSachDichVu);
            if (Array.isArray(services) && services.length > 0) {
              // Only get service name, not code
              primaryService = services[0]?.tenDichVu || 'Điều trị';
            }
          } catch (error) {
            console.warn('Error parsing services JSON, fallback to splitting:', error);
            const treatmentServices = selectedTreatmentPlan.danhSachDichVu.split(',');
            primaryService = treatmentServices[0]?.trim() || 'Điều trị';
          }
        }

        console.log('🔍 Service from treatment plan:', {
          originalDanhSachDichVu: selectedTreatmentPlan.danhSachDichVu,
          extractedService: primaryService
        });
        const duration = 60; // Default 60 minutes

        // Calculate end time
        const [hours, minutes] = appointmentTime.split(':').map(Number);
        const endTime = new Date();
        endTime.setHours(hours, minutes + duration);
        const endTimeStr = endTime.toTimeString().substring(0, 5);

        const appointmentData = {
          maLieuTrinh: selectedTreatmentPlan.maLieuTrinh,
          maKhachHang: selectedTreatmentPlan.maKhachHang,
          tenKhachHang: selectedTreatmentPlan.tenKhachHang,
          ngayThucHien: formattedDate,
          gioBatDau: appointmentTime,
          gioKetThuc: endTimeStr,
          dichVuThucHien: primaryService,
          nhanVienThucHien: selectedStaff || '',
          nguoiChinh: selectedSupervisor || '',
          danhGia: '',
          ghiChu: notes,
          trangThai: 'Đã lên lịch',
        };

        console.log('📋 Appointment data being sent:', appointmentData);

        const res = await fetch('/api/luot-tri-lieu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appointmentData),
        });

        console.log('🌐 API Response status:', res.status, res.statusText);

        if (!res.ok) {
          const errorData = await res.json();
          console.error('❌ API Error:', errorData);
          throw new Error(errorData.error || 'Failed to create appointment');
        }

        const responseData = await res.json();
        console.log('✅ API Success response:', responseData);

        // Invalidate and refetch treatment sessions data
        queryClient.invalidateQueries({ queryKey: ['treatment-sessions'] });

        toast.success('Đã tạo lịch hẹn thành công!');

        // Navigate to the appointment date to show the new appointment
        const appointmentDateObj = new Date(formattedDate);
        // Pass the date to parent component through onSave callback
        onSave(appointmentDateObj);
      } catch (error) {
        console.error('Error creating appointment:', error);
        toast.error('Có lỗi xảy ra khi tạo lịch hẹn!');
      }
    };

    await createAppointment();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative bg-white rounded-lg max-w-lg w-full p-6">
          <h3 className="text-lg font-semibold mb-4">Thêm lịch hẹn mới</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Treatment Plan Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Liệu trình <span className="text-red-500">*</span>
              </label>

              {selectedTreatmentPlan ? (
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{selectedTreatmentPlan.tenLieuTrinh}</p>
                      <p className="text-sm text-gray-600">
                        {selectedTreatmentPlan.tenKhachHang} • {selectedTreatmentPlan.maLieuTrinh}
                      </p>
                      <p className="text-xs text-gray-500">
                        SĐT: {customers.find((c: KhachHang) => c.maKhachHang === selectedTreatmentPlan.maKhachHang)?.soDienThoai || 'Chưa có'} • Địa chỉ: {customers.find((c: KhachHang) => c.maKhachHang === selectedTreatmentPlan.maKhachHang)?.diaChi || 'Chưa có'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTreatmentPlan(null)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Thay đổi
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTreatmentModal(true)}
                  className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-700"
                >
                  Chọn liệu trình
                </button>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📅 Ngày hẹn <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="appointmentDatePicker"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  placeholder="dd/mm/yyyy"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  required
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">
                  Chọn ngày từ hôm nay trở đi
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🕐 Giờ hẹn <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    min="07:00"
                    max="20:00"
                    step="900"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Giờ làm việc: 7:00 - 20:00 (bước 15 phút)
                </p>
              </div>
            </div>

            {/* Staff Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nhân viên phụ trách
              </label>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Chọn nhân viên</option>
                {staff.filter((s: NhanVien) => s.trangThai === 'Hoạt động').map((staffMember: NhanVien) => (
                  <option key={staffMember.maNhanVien} value={staffMember.hoVaTen}>
                    {staffMember.hoVaTen}
                  </option>
                ))}
              </select>
            </div>

            {/* Supervisor Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Người chính (Quản lý/Giám sát)
              </label>
              <select
                value={selectedSupervisor}
                onChange={(e) => setSelectedSupervisor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Chọn người chính</option>
                {staff
                  .filter((s: NhanVien) =>
                    s.trangThai === 'Hoạt động' &&
                    s.quyenHan === 'Admin'
                  )
                  .map((supervisor: NhanVien) => (
                    <option key={supervisor.maNhanVien} value={supervisor.hoVaTen}>
                      {supervisor.hoVaTen}
                    </option>
                  ))
                }
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Để tính lương quản lý dựa trên chênh lệch hoa hồng
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="Ghi chú thêm về lịch hẹn..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 text-white rounded-md transition-colors ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {isSubmitting ? 'Đang tạo...' : 'Thêm lịch hẹn'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowCustomerModal(false)} />

            <div className="relative bg-white rounded-lg max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Chọn khách hàng</h3>
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="mb-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm khách hàng..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <div className="grid gap-2">
                  {filteredCustomers.map((customer: KhachHang) => (
                    <div
                      key={customer.maKhachHang}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setShowCustomerModal(false);
                      }}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{customer.hoVaTen}</p>
                          <p className="text-sm text-gray-600">
                            {customer.soDienThoai} • {customer.maKhachHang}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          customer.trangThai === 'VIP'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {customer.trangThai || 'Mới'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Treatment Plan Selection Modal */}
      {showTreatmentModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowTreatmentModal(false)} />

            <div className="relative bg-white rounded-lg max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Chọn liệu trình</h3>
                <button
                  onClick={() => setShowTreatmentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="mb-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm liệu trình..."
                    value={treatmentSearch}
                    onChange={(e) => setTreatmentSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <div className="grid gap-2">
                  {filteredTreatmentPlans.map((plan: LieuTrinh) => {
                    // Find customer info based on treatment's customer ID
                    const customer = customers.find((c: KhachHang) => c.maKhachHang === plan.maKhachHang);

                    return (
                      <div
                        key={plan.maLieuTrinh}
                        onClick={() => {
                          setSelectedTreatmentPlan(plan);
                          setShowTreatmentModal(false);
                        }}
                        className="p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{plan.tenKhachHang}</p>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            plan.trangThai === 'Hoàn thành'
                              ? 'bg-green-100 text-green-600'
                              : plan.trangThai === 'Đang tiến hành'
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-yellow-100 text-yellow-600'
                          }`}>
                            {plan.trangThai || 'Mới'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Mã LT: {plan.maLieuTrinh} • 📞 {customer?.soDienThoai || 'Chưa có'} • 📍 {customer?.diaChi || 'Chưa có'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Appointment Details Modal
function AppointmentDetailsModal({ appointment, onClose }: any) {
  const queryClient = useQueryClient();
  const [isCompleting, setIsCompleting] = useState(false);
  const [additionalServices, setAdditionalServices] = useState<{ service: string; sessions: number }[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch treatment plan to get available services
  const { data: treatmentPlan } = useQuery({
    queryKey: ['treatment-plan', appointment.treatmentId],
    queryFn: async () => {
      if (!appointment.treatmentId) return null;
      const res = await fetch(`/api/lieu-trinh?id=${appointment.treatmentId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.find((t: any) => t.maLieuTrinh === appointment.treatmentId);
    },
    enabled: !!appointment.treatmentId,
  });

  // Parse existing additional services from notes
  useEffect(() => {
    if (appointment.notes) {
      // Try to find pattern like "Châm cứu: 1 buổi, Thủy châm: 2 buổi"
      const servicesMatch = appointment.notes.match(/([^|]+:\s*\d+\s*buổi(?:,\s*[^|]+:\s*\d+\s*buổi)*)/);
      if (servicesMatch) {
        const servicesText = servicesMatch[1].trim();
        const parsed = servicesText.split(',').map((item: string) => {
          const parts = item.trim().match(/(.+?):\s*(\d+)\s*buổi/);
          if (parts) {
            return { service: parts[1].trim(), sessions: parseInt(parts[2]) };
          }
          return null;
        }).filter(Boolean);

        if (parsed.length > 0) {
          setAdditionalServices(parsed as { service: string; sessions: number }[]);
        }
      }
    }
  }, [appointment.notes]);

  // Parse available services from treatment plan
  const getAvailableServices = (): string[] => {
    if (!treatmentPlan?.danhSachDichVu) return [];

    try {
      const services = JSON.parse(treatmentPlan.danhSachDichVu);
      if (Array.isArray(services)) {
        return services
          .map((s: any) => s.tenDichVu || s)
          .filter((serviceName: string) => {
            // Exclude services with "xoa bóp" or "massage" - these are main services
            const lowerName = serviceName.toLowerCase();
            return !lowerName.includes('xoa bóp') && !lowerName.includes('massage');
          });
      }
    } catch (error) {
      const servicesList = treatmentPlan.danhSachDichVu
        .split(',')
        .map((s: string) => s.trim())
        .filter((serviceName: string) => {
          // Exclude services with "xoa bóp" or "massage" - these are main services
          if (!serviceName) return false;
          const lowerName = serviceName.toLowerCase();
          return !lowerName.includes('xoa bóp') && !lowerName.includes('massage');
        });
      return servicesList;
    }
    return [];
  };

  // Add additional service
  const addAdditionalService = () => {
    const availableServices = getAvailableServices();
    if (availableServices.length > 0) {
      setAdditionalServices([...additionalServices, { service: availableServices[0], sessions: 1 }]);
    }
  };

  // Remove additional service
  const removeAdditionalService = (index: number) => {
    setAdditionalServices(additionalServices.filter((_, i) => i !== index));
  };

  // Update additional service
  const updateAdditionalService = (index: number, field: 'service' | 'sessions', value: string | number) => {
    const updated = [...additionalServices];
    if (field === 'service') {
      updated[index].service = value as string;
    } else {
      updated[index].sessions = parseInt(value as string) || 1;
    }
    setAdditionalServices(updated);
  };

  // Format additional services for notes
  const formatAdditionalServicesForNotes = (): string => {
    if (additionalServices.length === 0) return '';

    // List each service with its session count
    return additionalServices
      .map(item => `${item.service}: ${item.sessions} buổi`)
      .join(', ');
  };

  // Save additional services to notes
  const handleSaveAdditionalServices = async () => {
    setIsUpdating(true);
    try {
      const additionalServicesText = formatAdditionalServicesForNotes();

      // Remove existing additional services from notes (any text matching "ServiceName: X buổi" pattern)
      let baseNotes = appointment.notes || '';
      // Remove pattern like "Châm cứu: 1 buổi, Thủy châm: 2 buổi" or "Châm cứu: 1 buổi"
      baseNotes = baseNotes.replace(/[^|]+:\s*\d+\s*buổi(?:,\s*[^|]+:\s*\d+\s*buổi)*/g, '').trim();
      // Clean up any leftover pipes
      baseNotes = baseNotes.replace(/^\|\s*|\s*\|$/g, '').trim();
      baseNotes = baseNotes.replace(/\s*\|\s*\|/g, ' |').trim();

      // Combine with new additional services
      let combinedNotes = baseNotes;
      if (additionalServicesText) {
        combinedNotes = combinedNotes
          ? `${combinedNotes} | ${additionalServicesText}`
          : additionalServicesText;
      }

      const response = await fetch('/api/luot-tri-lieu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maLuot: appointment.id,
          ghiChu: combinedNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notes');
      }

      queryClient.invalidateQueries({ queryKey: ['treatment-sessions'] });
      toast.success('Đã lưu dịch vụ thêm!');
    } catch (error) {
      console.error('Error saving additional services:', error);
      toast.error('Có lỗi xảy ra khi lưu dịch vụ thêm!');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCompleteSession = async () => {
    if (appointment.status === 'completed') {
      toast.error('Buổi điều trị này đã được hoàn thành!');
      return;
    }

    setIsCompleting(true);

    try {
      // Update the treatment session status to completed
      const response = await fetch(`/api/luot-tri-lieu/${appointment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trangThai: 'Hoàn thành'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete session');
      }

      // Invalidate and refetch treatment sessions data
      queryClient.invalidateQueries({ queryKey: ['treatment-sessions'] });

      toast.success('Đã hoàn thành buổi điều trị!');
      onClose();
    } catch (error) {
      console.error('Error completing session:', error);
      toast.error('Có lỗi xảy ra khi hoàn thành buổi điều trị!');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-semibold mb-4">Chi tiết lịch hẹn</h3>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Khách hàng</p>
              <p className="font-medium">{appointment.customerName}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Số điện thoại</p>
              <p className="font-medium">{appointment.phone}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Dịch vụ</p>
              <p className="font-medium">{appointment.service}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Thời gian</p>
              <p className="font-medium">
                {appointment.date} - {appointment.time} ({appointment.duration} phút)
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Nhân viên phụ trách</p>
              <p className="font-medium">{appointment.staff}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Trạng thái</p>
              <p className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {appointment.status === 'completed' ? 'Đã hoàn thành' :
                 appointment.status === 'confirmed' ? 'Đã xác nhận' :
                 appointment.status === 'cancelled' ? 'Đã hủy' :
                 'Đã lên lịch'}
              </p>
            </div>

            {appointment.notes && (
              <div>
                <p className="text-sm text-gray-600">Ghi chú</p>
                <p className="font-medium">{appointment.notes}</p>
              </div>
            )}
          </div>

          {/* Additional Services Section */}
          {treatmentPlan && getAvailableServices().length > 0 && appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
            <div className="mt-6 border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">Dịch vụ thêm</h4>
                <button
                  type="button"
                  onClick={addAdditionalService}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  + Thêm dịch vụ
                </button>
              </div>

              {additionalServices.length > 0 ? (
                <div className="space-y-3">
                  {additionalServices.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={item.service}
                        onChange={(e) => updateAdditionalService(index, 'service', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                      >
                        {getAvailableServices().map((service, sIdx) => (
                          <option key={sIdx} value={service}>
                            {service}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.sessions}
                        onChange={(e) => updateAdditionalService(index, 'sessions', e.target.value)}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                        placeholder="Buổi"
                      />
                      <span className="text-sm text-gray-600 whitespace-nowrap">buổi</span>
                      <button
                        type="button"
                        onClick={() => removeAdditionalService(index)}
                        className="text-red-600 hover:text-red-700 px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={handleSaveAdditionalServices}
                    disabled={isUpdating}
                    className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    {isUpdating ? 'Đang lưu...' : 'Lưu dịch vụ thêm'}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Chưa có dịch vụ thêm nào được chọn</p>
              )}

              <p className="text-xs text-gray-500 mt-3">
                💡 Dịch vụ thêm sẽ được lưu vào ghi chú (ví dụ: &quot;Châm cứu: 1 buổi, Thủy châm: 2 buổi&quot;)
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Đóng
            </button>

            {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
              <button
                onClick={handleCompleteSession}
                disabled={isCompleting}
                className="flex items-center px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isCompleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4 mr-2" />
                    Hoàn thành
                  </>
                )}
              </button>
            )}

            {appointment.status === 'completed' && (
              <div className="flex items-center px-4 py-2 text-green-600 bg-green-50 rounded-md">
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Đã hoàn thành
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}