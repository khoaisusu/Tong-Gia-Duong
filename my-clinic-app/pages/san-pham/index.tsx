import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ArchiveBoxIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { SanPham } from '../../utils/columnMapping';
import { formatCurrency, generateId } from '../../utils/formatting';

export default function SanPhamPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SanPham | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');

  // Fetch products
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/san-pham');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      console.log('🛍️ Raw API response:', data);
      console.log('🛍️ First product structure:', data[0]);
      console.log('🛍️ First product keys:', data[0] ? Object.keys(data[0]) : 'No data');
      return data;
    },
  });

  // Product categories
  const categories = [
    'Tất cả',
    'Dầu xoa bóp',
    'Cao dán',
    'Thuốc uống',
    'Thực phẩm chức năng',
    'Dụng cụ y tế',
    'Khác'
  ];

  // Filter products
  const filteredProducts = products.filter((product: SanPham) => {
    console.log('🔍 Product:', product);
    console.log('🔍 tenSanPham:', product.tenSanPham);
    console.log('🔍 maSanPham:', product.maSanPham);
    console.log('🔍 loaiSanPham:', product.loaiSanPham);

    const matchesSearch = searchTerm === '' ||
                          product.tenSanPham?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.maSanPham?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Tất cả' || product.loaiSanPham === selectedCategory;

    console.log('🔍 matchesSearch:', matchesSearch, 'matchesCategory:', matchesCategory);
    return matchesSearch && matchesCategory;
  });

  console.log('🔍 Products:', products);
  console.log('🔍 Filtered products:', filteredProducts);
  console.log('🔍 Search term:', searchTerm);
  console.log('🔍 Selected category:', selectedCategory);

  // Statistics
  const stats = {
    total: products.length,
    inStock: products.filter((p: SanPham) => parseInt(p.soLuongTon || '0') > 0).length,
    outOfStock: products.filter((p: SanPham) => parseInt(p.soLuongTon || '0') === 0).length,
    totalValue: products.reduce((sum: number, p: SanPham) => {
      const price = parseFloat(p.giaBan || '0');
      const quantity = parseInt(p.soLuongTon || '0');
      const value = (isNaN(price) ? 0 : price) * (isNaN(quantity) ? 0 : quantity);
      return sum + value;
    }, 0),
  };

  return (
    <Layout title="Quản lý sản phẩm">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {session?.user?.role === 'Admin' && (
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setShowForm(true);
                }}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Thêm sản phẩm
              </button>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng sản phẩm</p>
                <p className="text-2xl font-bold text-primary-700">{stats.total}</p>
              </div>
              <ShoppingBagIcon className="w-8 h-8 text-primary-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Còn hàng</p>
                <p className="text-2xl font-bold text-green-600">{stats.inStock}</p>
              </div>
              <ArchiveBoxIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hết hàng</p>
                <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
              </div>
              <ArchiveBoxIcon className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Giá trị tồn kho</p>
                <p className="text-xl font-bold text-purple-600">{formatCurrency(stats.totalValue)}</p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-600">
              <p className="text-lg font-medium mb-2">Không thể tải dữ liệu sản phẩm</p>
              <p className="text-sm text-gray-500 mb-4">{error.message}</p>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Thử lại
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mã SP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên sản phẩm
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loại
                    </th>
                    {session?.user?.role === 'Admin' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Giá nhập
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Giá bán
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tồn kho
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {session?.user?.role === 'Admin' ? 'Thao tác' : 'Mô tả'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product: SanPham, index: number) => (
                    <tr key={product.maSanPham || `product-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {product.maSanPham || 'SP-' + (products.indexOf(product) + 1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.tenSanPham || product.loaiSanPham}</div>
                          {product.moTa && (
                            <div className="text-sm text-gray-500">{product.moTa}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {product.loaiSanPham}
                        </span>
                      </td>
                      {session?.user?.role === 'Admin' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(product.giaNhap)}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(product.giaBan)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`text-sm font-medium ${
                            parseInt(product.soLuongTon) === 0 
                              ? 'text-red-600' 
                              : parseInt(product.soLuongTon) < 10 
                              ? 'text-yellow-600' 
                              : 'text-gray-900'
                          }`}>
                            {product.soLuongTon} {product.donVi}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          parseInt(product.soLuongTon) === 0 
                            ? 'bg-red-100 text-red-800'
                            : product.trangThai === 'Còn hàng'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {parseInt(product.soLuongTon) === 0 ? 'Hết hàng' : product.trangThai}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {session?.user?.role === 'Admin' ? (
                          <>
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setShowForm(true);
                              }}
                              className="text-primary-600 hover:text-primary-900 mr-4"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
                                  // Handle delete
                                  toast.success('Xóa sản phẩm thành công!');
                                }
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <div className="text-left text-sm text-gray-600">
                            {product.moTa || '-'}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredProducts.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  {searchTerm || selectedCategory !== 'Tất cả' 
                    ? 'Không tìm thấy sản phẩm phù hợp' 
                    : 'Chưa có sản phẩm nào'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <ProductFormModal
          product={editingProduct}
          categories={categories.filter(c => c !== 'Tất cả')}
          onClose={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
          onSave={() => {
            setShowForm(false);
            setEditingProduct(null);
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success(editingProduct ? 'Cập nhật sản phẩm thành công!' : 'Thêm sản phẩm thành công!');
          }}
        />
      )}
    </Layout>
  );
}

// Product Form Modal Component
function ProductFormModal({ product, categories, onClose, onSave }: any) {
  const [formData, setFormData] = useState<SanPham>({
    maSanPham: product?.maSanPham || generateId('SP'),
    tenSanPham: product?.tenSanPham || '',
    loaiSanPham: product?.loaiSanPham || '',
    donVi: product?.donVi || 'Hộp',
    giaNhap: product?.giaNhap || '',
    giaBan: product?.giaBan || '',
    soLuongTon: product?.soLuongTon || '0',
    moTa: product?.moTa || '',
    trangThai: product?.trangThai || 'Còn hàng',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const url = product ? `/api/san-pham/${product.maSanPham}` : '/api/san-pham';
    const method = product ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    
    if (res.ok) {
      onSave();
    } else {
      toast.error('Có lỗi xảy ra, vui lòng thử lại!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg max-w-2xl w-full p-6">
          <h3 className="text-lg font-semibold mb-4">
            {product ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên sản phẩm <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.tenSanPham}
                  onChange={(e) => setFormData({ ...formData, tenSanPham: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại sản phẩm <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.loaiSanPham}
                  onChange={(e) => setFormData({ ...formData, loaiSanPham: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Chọn loại sản phẩm</option>
                  {categories.map((cat: string) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Đơn vị
                </label>
                <select
                  value={formData.donVi}
                  onChange={(e) => setFormData({ ...formData, donVi: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="Hộp">Hộp</option>
                  <option value="Chai">Chai</option>
                  <option value="Lọ">Lọ</option>
                  <option value="Tuýp">Tuýp</option>
                  <option value="Gói">Gói</option>
                  <option value="Cái">Cái</option>
                  <option value="Viên">Viên</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giá nhập
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.giaNhap}
                  onChange={(e) => setFormData({ ...formData, giaNhap: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giá bán <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.giaBan}
                  onChange={(e) => setFormData({ ...formData, giaBan: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số lượng tồn
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.soLuongTon}
                  onChange={(e) => setFormData({ ...formData, soLuongTon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trạng thái
                </label>
                <select
                  value={formData.trangThai}
                  onChange={(e) => setFormData({ ...formData, trangThai: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="Còn hàng">Còn hàng</option>
                  <option value="Ngừng kinh doanh">Ngừng kinh doanh</option>
                </select>
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  rows={3}
                  value={formData.moTa}
                  onChange={(e) => setFormData({ ...formData, moTa: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
              >
                {product ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}