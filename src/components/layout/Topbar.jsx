
import './Topbar.css';
import { useLocation } from 'react-router-dom';

const pageTitles = {
    '/': 'Overview',
    '/jobs': 'Jobs',
    '/candidates': 'Candidates',
    '/interviews': 'Interviews',
    '/availability': 'Availability',
    '/applications': 'Applications',
    '/analytics': 'Analytics',
    '/evaluations': 'Evaluations',
    '/offers': 'Offers',
};

function Topbar() {
    const { pathname } = useLocation();

    return (
        <header className="topbar">
            <div className="breadcrumb">
                <span>Workspace</span>
                <span className="breadcrumb-separator">/</span>
                <strong>{pageTitles[pathname] || 'Overview'}</strong>
            </div>

            <div className="topbar-actions">
                <div className="search-box">
                    <span>⌕</span>
                    <input
                        type="text"
                        placeholder="Search anything..."
                    />
                    <kbd>⌘ K</kbd>
                </div>

                <button className="notification-button">
                    ♧
                    <span className="notification-dot"></span>
                </button>

            </div>
        </header>
    );
}

export default Topbar;
