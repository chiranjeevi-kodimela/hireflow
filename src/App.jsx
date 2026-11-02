import { BrowserRouter, Routes, Route } from 'react-router-dom';

import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Requisitions from './pages/Requisitions';
import Candidates from './pages/Candidates';
function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/jobs" element={<Requisitions />} />
          <Route path="/candidates" element={<Candidates />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;