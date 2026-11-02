import { BrowserRouter, Routes, Route } from 'react-router-dom';

import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Requisitions from './pages/Requisitions';
import Candidates from './pages/Candidates';
import Applications from './pages/Applications';
import Interviews from './pages/Interviews';

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/jobs" element={<Requisitions />} />
          <Route path="/candidates" element={<Candidates />} />
          <Route path="/interviews" element={<Interviews />} />
          <Route path="/applications" element={<Applications />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;