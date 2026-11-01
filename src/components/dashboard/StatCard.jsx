
import {
    Users,
    BriefcaseBusiness,
    CalendarDays,
    UserCheck
} from 'lucide-react';

import './StatCard.css';

const icons = {
    candidates: Users,
    jobs: BriefcaseBusiness,
    interviews: CalendarDays,
    hired: UserCheck,
};

function StatCard({ type, title, value, change, description }) {
    const Icon = icons[type];

    return (
        <div className={`stat-card stat-${type}`}>
            <div className="stat-card-top">
                <span>{title}</span>
                <div className="stat-icon">
                    <Icon size={19} />
                </div>
            </div>

            <div className="stat-value">{value}</div>

            <div className="stat-footer">
                <span className="stat-change">{change}</span>
                <span>{description}</span>
            </div>
        </div>
    );
}

export default StatCard;
