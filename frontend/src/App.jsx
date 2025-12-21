import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalProvider } from './context/GlobalContext';
import { DictionaryProvider } from './context/DictionaryContext';
import { CoachProvider } from './context/CoachContext';
import Layout from './components/Layout/Layout';
import Learn from './views/Learn';
import Drill from './views/Drill';
import Apply from './views/Apply';
import Stats from './views/Stats';
import Coach from './views/Coach'; // New Coach View
import VoiceLab from './views/VoiceLab'; // Voice Vendor Test Page
import Playground from './views/Playground';
import AUIStreamingDemo from './views/AUIStreamingDemo'; // AUI Streaming Test

function App() {
  return (
    <GlobalProvider>
      <DictionaryProvider>
        <CoachProvider>
          <BrowserRouter>
            <Routes>
              {/* Coach Mode Route (Standalone) */}
              <Route path="/coach" element={<Coach />} />
              <Route path="/voice-lab" element={<VoiceLab />} />
              <Route path="/playground" element={<Playground />} />
              <Route path="/aui-stream-demo" element={<AUIStreamingDemo />} />

              {/* Mixed Mode Routes (Legacy/Standard) */}
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/learn" replace />} />
                <Route path="learn" element={<Learn />} />
                <Route path="drill" element={<Drill />} />
                <Route path="apply" element={<Apply />} />
                <Route path="stats" element={<Stats />} />
                <Route path="*" element={<Navigate to="/learn" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </CoachProvider>
      </DictionaryProvider>
    </GlobalProvider>
  );
}

export default App;
