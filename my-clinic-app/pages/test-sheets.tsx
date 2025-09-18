import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '../components/Layout';

export default function TestSheetsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const testAPI = async (apiPath: string, name: string) => {
    console.log(`🧪 Testing ${name}...`);
    const start = Date.now();
    
    try {
      const response = await fetch(apiPath);
      const end = Date.now();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const result = {
        name,
        success: true,
        time: end - start,
        dataCount: Array.isArray(data) ? data.length : 'Invalid data',
        data: Array.isArray(data) ? data.slice(0, 2) : data // Show first 2 records
      };
      
      console.log(`✅ ${name} OK - ${end - start}ms`);
      return result;
    } catch (err: any) {
      const end = Date.now();
      console.error(`❌ ${name} Error:`, err);
      return {
        name,
        success: false,
        time: end - start,
        error: err.message,
        data: null
      };
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setResults([]);
    setError(null);
    
    try {
      console.log('🚀 Bắt đầu test tất cả APIs...');
      
      const tests = [
        testAPI('/api/khach-hang', 'Khách hàng'),
        testAPI('/api/don-hang', 'Đơn hàng'),  
        testAPI('/api/lieu-trinh', 'Liệu trình'),
        testAPI('/api/giao-dich', 'Giao dịch'),
      ];
      
      const results = await Promise.all(tests);
      setResults(results);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <Layout title="Test Google Sheets">
        <div className="text-center p-8">
          <p className="text-gray-600">Vui lòng đăng nhập để test APIs</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Test Google Sheets">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Test Google Sheets APIs</h1>
          <p className="text-gray-600 mb-4">
            Trang này giúp debug các vấn đề với Google Sheets API
          </p>
          
          <button
            onClick={runAllTests}
            disabled={loading}
            className={`px-6 py-3 rounded-md font-medium ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? '🔄 Đang test...' : '🧪 Chạy test tất cả APIs'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-800">Lỗi:</h3>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            {results.map((result, index) => (
              <div 
                key={index}
                className={`border rounded-lg p-4 ${
                  result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">
                    {result.success ? '✅' : '❌'} {result.name}
                  </h3>
                  <span className={`text-sm px-2 py-1 rounded ${
                    result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {result.time}ms
                  </span>
                </div>
                
                {result.success ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Số bản ghi: <strong>{result.dataCount}</strong>
                    </p>
                    {result.data && result.data.length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-blue-600">Xem dữ liệu mẫu</summary>
                        <pre className="mt-2 bg-gray-100 p-2 rounded overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ) : (
                  <p className="text-red-600 text-sm">{result.error}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}