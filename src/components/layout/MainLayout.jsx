
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './MainLayout.css';

function MainLayout({ children }) {
    return (
        <div className="app-layout">
            <Sidebar />

            <div className="main-section">
                <Topbar />

                <main className="page-content">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default MainLayout;
