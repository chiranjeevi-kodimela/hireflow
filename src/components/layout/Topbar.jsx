
import './Topbar.css';

function Topbar() {
    return (
        <header className="topbar">
            <div className="breadcrumb">
                <span>Workspace</span>
                <span className="breadcrumb-separator">/</span>
                <strong>Overview</strong>
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

                <div className="topbar-date">
                    MON, NOV 02
                </div>
            </div>
        </header>
    );
}

export default Topbar;
