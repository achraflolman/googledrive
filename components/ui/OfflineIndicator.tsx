import React from 'react';
import { WifiOff } from 'lucide-react';

interface OfflineIndicatorProps {
  isOnline: boolean;
  t: (key: string) => string;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ isOnline, t }) => {
  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white py-2 px-4 rounded-lg shadow-lg flex items-center z-[100] animate-fade-in-slow">
      <WifiOff className="w-5 h-5 mr-3" />
      <span>{t('app_offline_message')}</span>
    </div>
  );
};

export default OfflineIndicator;
