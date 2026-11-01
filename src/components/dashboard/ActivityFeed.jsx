
import { UserPlus, CalendarCheck, CheckCircle2 } from 'lucide-react';
import './ActivityFeed.css';

const activities = [
    {
        name: 'Rahul Sharma',
        action: 'moved to technical interview',
        time: '10 minutes ago',
        icon: CalendarCheck,
    },
    {
        name: 'Priya Reddy',
        action: 'was added to the talent pool',
        time: '35 minutes ago',
        icon: UserPlus,
    },
    {
        name: 'Arjun Kumar',
        action: 'received an evaluation',
        time: '1 hour ago',
        icon: CheckCircle2,
    },
];

function ActivityFeed() {
    return (
        <section className="activity-card">
            <div className="section-heading">
                <div>
                    <h3>Recent activity</h3>
                    <p>Latest recruitment updates</p>
                </div>
            </div>

            <div className="activity-list">
                {activities.map((activity) => {
                    const Icon = activity.icon;

                    return (
                        <div className="activity-item" key={activity.name}>
                            <div className="activity-icon">
                                <Icon size={17} />
                            </div>

                            <div className="activity-details">
                                <p>
                                    <strong>{activity.name}</strong>
                                    {' '}{activity.action}
                                </p>
                                <span>{activity.time}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

export default ActivityFeed;
