import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalProvider } from './context/GlobalContext';
import { DictionaryProvider } from './context/DictionaryContext';
import Layout from './components/Layout/Layout';
import Learn from './views/Learn';
import Drill from './views/Drill';
import Apply from './views/Apply';
import Stats from './views/Stats';

function App() {
  return (
    <GlobalProvider>
      <DictionaryProvider>
        <BrowserRouter>
          <Routes>
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
      </DictionaryProvider>
    </GlobalProvider>
  );
}

export default App;
