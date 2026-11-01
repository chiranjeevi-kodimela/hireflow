
import './Sidebar.css';

const navigation = [
    {
        section: 'WORKSPACE', items: [
            { label: 'Overview', icon: '◫', path: '/' },
            { label: 'Candidates', icon: '◎', path: '/candidates' },
            { label: 'Jobs', icon: '▤', path: '/jobs' },
            { label: 'Interviews', icon: '▦', path: '/interviews' },
        ]
    },
    {
        section: 'INSIGHTS', items: [
            { label: 'Analytics', icon: '⌁', path: '/analytics' },
        ]
    },
    {
        section: 'MANAGEMENT', items: [
            { label: 'Evaluations', icon: '☷', path: '/evaluations' },
            { label: 'Offers', icon: '✉', path: '/offers' },
        ]
    },
];

function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <span className="brand-symbol">h.</span>
                <span>hireflow</span>
            </div>

            <div className="workspace-switcher">
                <div className="workspace-avatar">H</div>
                <div>
                    <p>Workspace</p>
                    <span>Hiring Team</span>
                </div>
                <span className="switcher-arrow">⌄</span>
            </div>

            <nav className="sidebar-navigation">
                {navigation.map((group) => (
                    <div className="nav-group" key={group.section}>
                        <p className="nav-section-title">{group.section}</p>

                        {group.items.map((item) => (
                            <a
                                href={item.path}
                                className={`nav-item ${item.path === '/' ? 'active' : ''}`}
                                key={item.label}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span>{item.label}</span>
                            </a>
                        ))}
                    </div>
                ))}
            </nav>

            <div className="sidebar-bottom">
                <div className="sidebar-help">
                    <span>?</span>
                    <div>
                        <p>Need assistance?</p>
                        <small>Visit our help center</small>
                    </div>
                </div>

                <div className="sidebar-profile">
                    <div className="profile-avatar">CK</div>
                    <div>
                        <p>Chiranjeevi</p>
                        <small>Administrator</small>
                    </div>
                    <span className="profile-menu">···</span>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
