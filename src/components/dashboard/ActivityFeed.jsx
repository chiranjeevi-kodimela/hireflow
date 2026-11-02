import {
    UserPlus,
    CalendarCheck,
    CheckCircle2,
    FileText,
    Activity
} from 'lucide-react';

import './ActivityFeed.css';

const icons = {
    Candidate: UserPlus,
    Interview: CalendarCheck,
    Scorecard: CheckCircle2,
    Offer: FileText,
    Application: Activity,
    Requisition: FileText,
};

function formatTime(date) {
    const seconds = Math.floor(
        (Date.now() - new Date(date).getTime()) / 1000
    );

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;

    return `${Math.floor(seconds / 86400)} days ago`;
}

function ActivityFeed({ activities = [] }) {
    return (
        <section className="activity-card">
            <div className="section-heading">
                <div>
                    <h3>Recent activity</h3>
                    <p>Latest recruitment updates</p>
                </div>
            </div>

            <div className="activity-list">
                {activities.length === 0 ? (
                    <p>No recent activity available.</p>
                ) : (
                    activities.map((activity) => {
                        const Icon = icons[activity.entityType] || Activity;

                        return (
                            <div
                                className="activity-item"
                                key={activity.auditLogId}
                            >
                                <div className="activity-icon">
                                    <Icon size={17} />
                                </div>

                                <div className="activity-details">
                                    <p>
                                        <strong>{activity.entityType}</strong>
                                        {' — '}
                                        {activity.action.replaceAll('_', ' ').toLowerCase()}
                                    </p>

                                    <span>
                                        {formatTime(activity.createdAt)}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </section>
    );
}

export default ActivityFeed;