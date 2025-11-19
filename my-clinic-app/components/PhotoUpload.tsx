import React, { useState } from 'react';
import { PhotoIcon, XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface PhotoUploadProps {
  customerName: string;
  customerPhone: string;
  beforePhotos: string[];
  afterPhotos: string[];
  onBeforePhotosChange: (urls: string[]) => void;
  onAfterPhotosChange: (urls: string[]) => void;
}

export default function PhotoUpload({
  customerName,
  customerPhone,
  beforePhotos,
  afterPhotos,
  onBeforePhotosChange,
  onAfterPhotosChange,
}: PhotoUploadProps) {
  const [showUploadInstructions, setShowUploadInstructions] = useState(false);
  const [tempBeforeUrl, setTempBeforeUrl] = useState('');
  const [tempAfterUrl, setTempAfterUrl] = useState('');

  // Generate suggested filename for customer
  const generateFilename = (type: 'TDC' | 'SDT') => {
    const cleanName = customerName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove Vietnamese accents
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toUpperCase()
      .replace(/\s+/g, '_');

    const cleanPhone = customerPhone.replace(/\s+/g, '');
    return `${cleanName}_${cleanPhone}_${type}`;
  };

  // Convert Google Drive share link to direct image link
  const convertDriveLink = (url: string): string => {
    // If it's already a direct link, return as is
    if (url.includes('drive.google.com/uc?') || url.includes('drive.google.com/thumbnail')) {
      return url;
    }

    // Extract file ID from various Google Drive URL formats
    let fileId = '';

    // Format 1: https://drive.google.com/file/d/FILE_ID/view
    const match1 = url.match(/\/file\/d\/([^\/]+)/);
    if (match1) {
      fileId = match1[1];
    }

    // Format 2: https://drive.google.com/open?id=FILE_ID
    const match2 = url.match(/[?&]id=([^&]+)/);
    if (match2) {
      fileId = match2[1];
    }

    if (fileId) {
      // Return thumbnail format for better performance
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }

    // If can't parse, return original URL
    return url;
  };

  const addBeforePhoto = () => {
    if (!tempBeforeUrl.trim()) {
      toast.error('Vui lòng nhập link ảnh');
      return;
    }

    const convertedUrl = convertDriveLink(tempBeforeUrl.trim());
    onBeforePhotosChange([...beforePhotos, convertedUrl]);
    setTempBeforeUrl('');
    toast.success('Đã thêm ảnh trước điều trị');
  };

  const addAfterPhoto = () => {
    if (!tempAfterUrl.trim()) {
      toast.error('Vui lòng nhập link ảnh');
      return;
    }

    const convertedUrl = convertDriveLink(tempAfterUrl.trim());
    onAfterPhotosChange([...afterPhotos, convertedUrl]);
    setTempAfterUrl('');
    toast.success('Đã thêm ảnh sau điều trị');
  };

  const removeBeforePhoto = (index: number) => {
    onBeforePhotosChange(beforePhotos.filter((_, i) => i !== index));
    toast.success('Đã xóa ảnh');
  };

  const removeAfterPhoto = (index: number) => {
    onAfterPhotosChange(afterPhotos.filter((_, i) => i !== index));
    toast.success('Đã xóa ảnh');
  };

  return (
    <div className="space-y-6">
      {/* Upload Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <button
          type="button"
          onClick={() => setShowUploadInstructions(!showUploadInstructions)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="font-medium text-blue-900">
            📋 Hướng dẫn upload ảnh lên Google Drive
          </span>
          <span className="text-blue-600">{showUploadInstructions ? '▼' : '▶'}</span>
        </button>

        {showUploadInstructions && (
          <div className="mt-3 text-sm text-blue-800 space-y-2">
            <p className="font-medium">Đặt tên file theo format:</p>
            <div className="bg-white p-2 rounded border border-blue-300 font-mono text-xs">
              <p>Trước điều trị: <span className="text-green-600">{generateFilename('TDC')}.jpg</span></p>
              <p>Sau điều trị: <span className="text-green-600">{generateFilename('SDT')}.jpg</span></p>
            </div>

            <ol className="list-decimal list-inside space-y-1 mt-3">
              <li>Đặt tên file ảnh theo format trên</li>
              <li>Upload ảnh lên Google Drive của bạn</li>
              <li>Click chuột phải vào file → &quot;Get link&quot; → Chọn &quot;Anyone with the link&quot;</li>
              <li>Copy link và paste vào ô bên dưới</li>
            </ol>
          </div>
        )}
      </div>

      {/* Before Treatment Photos */}
      <div className="border border-gray-300 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <PhotoIcon className="w-5 h-5 mr-2 text-blue-600" />
          Ảnh trước điều trị
        </h4>

        {/* Add photo input */}
        <div className="flex gap-2 mb-3">
          <input
            type="url"
            value={tempBeforeUrl}
            onChange={(e) => setTempBeforeUrl(e.target.value)}
            placeholder="Paste Google Drive link here..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBeforePhoto())}
          />
          <button
            type="button"
            onClick={addBeforePhoto}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center text-sm"
          >
            <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
            Thêm
          </button>
        </div>

        {/* Photo grid */}
        {beforePhotos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {beforePhotos.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Trước điều trị ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-gray-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EError%3C/text%3E%3C/svg%3E';
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeBeforePhoto(index)}
                  className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
            <PhotoIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Chưa có ảnh trước điều trị</p>
          </div>
        )}
      </div>

      {/* After Treatment Photos */}
      <div className="border border-gray-300 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <PhotoIcon className="w-5 h-5 mr-2 text-green-600" />
          Ảnh sau điều trị
        </h4>

        {/* Add photo input */}
        <div className="flex gap-2 mb-3">
          <input
            type="url"
            value={tempAfterUrl}
            onChange={(e) => setTempAfterUrl(e.target.value)}
            placeholder="Paste Google Drive link here..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAfterPhoto())}
          />
          <button
            type="button"
            onClick={addAfterPhoto}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center text-sm"
          >
            <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
            Thêm
          </button>
        </div>

        {/* Photo grid */}
        {afterPhotos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {afterPhotos.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Sau điều trị ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-gray-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EError%3C/text%3E%3C/svg%3E';
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeAfterPhoto(index)}
                  className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
            <PhotoIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Chưa có ảnh sau điều trị</p>
          </div>
        )}
      </div>
    </div>
  );
}
