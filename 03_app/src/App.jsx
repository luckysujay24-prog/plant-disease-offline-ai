import React, { useState, useEffect } from 'react';
import { StatusBanner } from './components/StatusBanner.jsx';
import { Navbar } from './components/Navbar.jsx';
import { Home } from './pages/Home.jsx';
import { ChooseCrop } from './pages/ChooseCrop.jsx';
import { DetectDisease } from './pages/DetectDisease.jsx';
import { Result } from './pages/Result.jsx';
import { CropCare } from './pages/CropCare.jsx';
import { History } from './pages/History.jsx';
import { Settings } from './pages/Settings.jsx';
import { initModel } from './ml/modelRunner.js';

export function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedCrop, setSelectedCrop] = useState({ slug: 'tomato', mode: 'known', displayName: 'Tomato' });
  const [currentScan, setCurrentScan] = useState(null);
  const [currentImageSrc, setCurrentImageSrc] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [aiStatus, setAiStatus] = useState('Initializing AI...');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Warm up edge model on app startup
    initModel((status) => setAiStatus(status)).catch(err => {
      console.warn('Startup model warmup deferred:', err);
      setAiStatus('AI offline ready');
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSelectCrop = (crop) => {
    setSelectedCrop(crop);
    setCurrentPage('detect');
  };

  const handleDiagnosisComplete = (scanRecord, imageSrc) => {
    setCurrentScan(scanRecord);
    setCurrentImageSrc(imageSrc);
    setCurrentPage('result');
  };

  const handleSelectHistoryScan = (scanRecord, thumbSrc) => {
    setCurrentScan(scanRecord);
    setCurrentImageSrc(thumbSrc || null);
    setCurrentPage('result');
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'choose-crop': return 'Choose Crop';
      case 'detect': return 'Diagnose Disease';
      case 'result': return 'Diagnosis Result';
      case 'crop-care': return 'Crop Care Guide';
      case 'history': return 'Saved Scans';
      case 'settings': return 'Settings & Cloud';
      case 'home':
      default: return 'Crop Health AI';
    }
  };

  return (
    <div className="app-container">
      {/* Header Bar */}
      <header className="header-bar">
        {currentPage !== 'home' ? (
          <button
            onClick={() => setCurrentPage('home')}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '4px 8px',
              marginRight: '8px'
            }}
          >
            ←
          </button>
        ) : (
          <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>🌱</span>
        )}
        <h1 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, flex: 1 }}>
          {getPageTitle()}
        </h1>
      </header>

      {/* Online / Offline / AI Status Banner */}
      <StatusBanner isOnline={isOnline} aiReadyStatus={aiStatus} />

      {/* Main Content View */}
      <main className="content-area">
        {currentPage === 'home' && (
          <Home
            onNavigate={setCurrentPage}
            onSelectScan={handleSelectHistoryScan}
          />
        )}
        {currentPage === 'choose-crop' && (
          <ChooseCrop onSelectCrop={handleSelectCrop} />
        )}
        {currentPage === 'detect' && (
          <DetectDisease
            selectedCrop={selectedCrop}
            onDiagnosisComplete={handleDiagnosisComplete}
          />
        )}
        {currentPage === 'result' && (
          <Result
            scan={currentScan}
            imageSrc={currentImageSrc}
            onScanAgain={() => setCurrentPage('choose-crop')}
          />
        )}
        {currentPage === 'crop-care' && (
          <CropCare initialCrop={selectedCrop} />
        )}
        {currentPage === 'history' && (
          <History onSelectScan={handleSelectHistoryScan} />
        )}
        {currentPage === 'settings' && (
          <Settings />
        )}
      </main>

      {/* Bottom Navigation */}
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
    </div>
  );
}

export default App;
