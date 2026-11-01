
import { Plus, ArrowUpRight } from 'lucide-react';

import StatCard from '../components/dashboard/StatCard';
import HiringPipeline from '../components/dashboard/HiringPipeline';
import ActivityFeed from '../components/dashboard/ActivityFeed';

import './Dashboard.css';

function Dashboard() {
    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <span className="dashboard-eyebrow">
                        RECRUITMENT OVERVIEW
                    </span>

                    <h1>Good morning, Admin.</h1>

                    <p>
                        Here's what's happening across your hiring operations.
                    </p>
                </div>

                <button className="create-job-button">
                    <Plus size={17} />
                    Create requisition
                </button>
            </div>

            <div className="dashboard-stats">
                <StatCard
                    type="candidates"
                    title="Total candidates"
                    value="248"
                    change="+12.8%"
                    description="vs last month"
                />

                <StatCard
                    type="jobs"
                    title="Open positions"
                    value="12"
                    change="+3"
                    description="new this month"
                />

                <StatCard
                    type="interviews"
                    title="Interviews scheduled"
                    value="36"
                    change="+8.2%"
                    description="vs last month"
                />

                <StatCard
                    type="hired"
                    title="Successful hires"
                    value="18"
                    change="+15.4%"
                    description="vs last month"
                />
            </div>

            <div className="dashboard-main-grid">
                <HiringPipeline />
                <ActivityFeed />
            </div>

            <div className="dashboard-bottom">
                <div className="bottom-heading">
                    <h3>Recruitment snapshot</h3>
                    <span>
                        View detailed analytics <ArrowUpRight size={14} />
                    </span>
                </div>

                <p>
                    Your recruitment workspace is active. Monitor candidate
                    progression and keep your hiring teams aligned.
                </p>
            </div>
        </div>
    );
}

export default Dashboard;
