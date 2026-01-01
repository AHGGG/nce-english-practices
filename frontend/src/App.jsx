import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalProvider } from './context/GlobalContext';
import { DictionaryProvider } from './context/DictionaryContext';
import PerformanceReport from './views/PerformanceReport';
import VoiceLab from './views/VoiceLab';
import AUIStreamingDemo from './views/AUIStreamingDemo';

import VoiceMode from './views/VoiceMode';
import ReadingMode from './views/ReadingMode';
import NavDashboard from './views/NavDashboard';
import LabCalibration from './components/lab/LabCalibration';
import SentenceStudy from './components/sentence-study';

function App() {
  return (
    <GlobalProvider>
      <DictionaryProvider>
        <BrowserRouter>
          <Routes>
            {/* Default route */}
            <Route path="/" element={<Navigate to="/nav" replace />} />

            {/* Main routes */}
            <Route path="/voice-lab" element={<VoiceLab />} />
            <Route path="/voice" element={<VoiceMode />} />
            <Route path="/reading" element={<ReadingMode />} />
            <Route path="/sentence-study" element={<SentenceStudy />} />
            <Route path="/lab/calibration" element={<LabCalibration />} />
            <Route path="/nav" element={<NavDashboard />} />
            <Route path="/performance" element={<PerformanceReport />} />
            <Route path="/aui-stream-demo" element={<AUIStreamingDemo />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/nav" replace />} />
          </Routes>
        </BrowserRouter>
      </DictionaryProvider>
    </GlobalProvider>
  );
}

export default App;


