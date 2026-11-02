import { BrowserRouter, Routes, Route } from 'react-router-dom';

import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Requisitions from './pages/Requisitions';

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/jobs" element={<Requisitions />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;