import React, { useState, useEffect, useRef } from 'react';
import { X, Check, XCircle, Maximize2, Minimize2, MoreHorizontal } from 'lucide-react';

interface Alert {
  fileId: string;
  sasUrl: string;
  alert: string;
  timestamp: string;
}

const AlertViewer: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [enlargedImageId, setEnlargedImageId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCutoffId, setLastCutoffId] = useState<string>('0');
  const [counter, setCounter] = useState<number>(0);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(true); // For password modal

  const hasFetched = useRef(false);

  const sortAlerts = (alertsToSort: Alert[]): Alert[] => {
    return alertsToSort.sort((a, b) => parseInt(b.fileId) - parseInt(a.fileId));
  };

  const fetchAlerts = async () => {
    if (loading || !apiKey) return; // Prevent multiple simultaneous fetches and ensure API key is provided
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://hackaton-processor-001.azurewebsites.net/FileData?cutoffId=${lastCutoffId}&hasAlert=false&pageSize=100&resolvedAlert=false`,
        {
          headers: {
            'X-API-Key': apiKey,
          },
        }
      );
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const raw = await response.json();
      const data: Alert[] = raw.data.map((item: any) => ({
        fileId: item.fileId,
        sasUrl: item.sasUrl,
        alert: item.alert,
        timestamp: item.timestamp,
      }));
      if (data.length > 0) {
        setAlerts((prevAlerts) => {
          const existingFileIds = new Set(prevAlerts.map((alert) => alert.fileId));
          const newAlerts = data.filter((alert) => !existingFileIds.has(alert.fileId));
          return sortAlerts([...prevAlerts, ...newAlerts]);
        });
        const maxFileId = Math.max(...data.map((alert) => parseInt(alert.fileId)));
        setLastCutoffId(maxFileId.toString());
      }
    } catch (error) {
      setError('Failed to fetch alerts. Please try again later.');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch alerts on component mount
  useEffect(() => {
    if (!hasFetched.current && apiKey) {
      fetchAlerts();
      hasFetched.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  useEffect(() => {
    const intervalId = setInterval(async () => {
      if (!apiKey) return;
      try {
        const response = await fetch(
          'https://hackaton-processor-001.azurewebsites.net/Counter?counterId=unique_counter',
          {
            headers: {
              'X-API-Key': apiKey,
            },
          }
        );
        if (!response.ok) {
          throw new Error('Failed to fetch counter');
        }
        const data = await response.json();
        setCounter(data.data.filter((row: any) => row.rowKey === 'unique_counter')[0].count);
      } catch (error) {
        console.error('Error fetching counter:', error);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [apiKey]);

  const resolveAlert = async (fileId: string) => {
    if (!apiKey) return;
    try {
      const response = await fetch(
        `https://hackaton-processor-001.azurewebsites.net/resolvealert?fileId=${fileId}`,
        {
          method: 'POST',
          headers: {
            'X-API-Key': apiKey,
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to resolve alert');
      }
      setAlerts((prevAlerts) => sortAlerts(prevAlerts.filter((alert) => alert.fileId !== fileId)));
    } catch (error) {
      console.error('Error resolving alert:', error);
      setError('Failed to resolve alert. Please try again.');
    }
  };

  const handleReport = (fileId: string): void => {
    resolveAlert(fileId);
  };

  const handleFalsePositive = (fileId: string): void => {
    resolveAlert(fileId);
  };

  const toggleEnlargedImage = (fileId: string | null): void => {
    setEnlargedImageId(fileId);
  };

  const handlePasswordSubmit = () => {
    const inputPassword = (document.getElementById('passwordInput') as HTMLInputElement).value;
    setApiKey(inputPassword);
    setShowPasswordModal(false);
  };

  return (
    <div className="container mx-auto p-4 bg-gray-100 min-h-screen">
      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-md">
            <h2 className="text-xl font-bold mb-4">Enter API Key</h2>
            <input
              id="passwordInput"
              type="password"
              placeholder="Enter API Key"
              className="border p-2 rounded w-full mb-4"
            />
            <button
              onClick={handlePasswordSubmit}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {/* Rest of the alert viewer code */}
      <div className="bg-blue-100 text-blue-800 p-2 text-center mb-4">
        Current number of people on site: {counter}
      </div>

      <h1 className="text-3xl font-bold mb-6 text-center">Safety Alert Feed</h1>
      {error && <p className="text-red-500 text-center mb-4">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {alerts.map((alert) => (
          <div key={alert.fileId} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="relative">
              <img
                src={alert.sasUrl}
                alt={`Alert ${alert.fileId}`}
                className="w-full h-48 object-cover cursor-pointer"
                onClick={() => toggleEnlargedImage(alert.fileId)}
              />
              <button
                onClick={() => handleReport(alert.fileId)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors duration-300"
              >
                <X size={20} />
              </button>
              <button
                onClick={() => toggleEnlargedImage(alert.fileId)}
                className="absolute bottom-2 right-2 bg-blue-500 text-white p-1 rounded-full hover:bg-blue-600 transition-colors duration-300"
              >
                <Maximize2 size={20} />
              </button>
            </div>
            <div className="p-4">
              <p className="font-semibold text-lg mb-1">{alert.alert}</p>
              <p className="text-sm text-gray-500 mb-3">
                {new Date(alert.timestamp).toLocaleString()}
              </p>
              <div className="flex justify-between">
                <button
                  onClick={() => handleFalsePositive(alert.fileId)}
                  className="flex items-center bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition-colors duration-300"
                >
                  <XCircle size={16} className="mr-1" /> False Positive
                </button>
                <button
                  onClick={() => handleReport(alert.fileId)}
                  className="flex items-center bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors duration-300"
                >
                  <Check size={16} className="mr-1" /> Reported
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {loading ? (
        <div className="text-center mt-4">
          <MoreHorizontal className="animate-pulse inline-block" size={24} />
          <p>Loading more alerts...</p>
        </div>
      ) : (
        <button
          onClick={fetchAlerts}
          className="block mx-auto mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors duration-300"
        >
          Load More
        </button>
      )}

      {enlargedImageId && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative">
            <img
              src={alerts.find((alert) => alert.fileId === enlargedImageId)?.sasUrl}
              alt={`Alert ${enlargedImageId}`}
              className="max-w-full max-h-full"
            />
            <button
              onClick={() => toggleEnlargedImage(null)}
              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors duration-300"
            >
              <X size={24} />
            </button>
            <button
              onClick={() => toggleEnlargedImage(null)}
              className="absolute bottom-2 right-2 bg-blue-500 text-white p-1 rounded hover:bg-blue-600 transition-colors duration-300"
            >
              <Minimize2 size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertViewer;
