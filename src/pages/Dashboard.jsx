import { useEffect, useState } from 'react';
import { Plus, ArrowUpRight } from 'lucide-react';

import StatCard from '../components/dashboard/StatCard';
import HiringPipeline from '../components/dashboard/HiringPipeline';
import ActivityFeed from '../components/dashboard/ActivityFeed';

import { getDashboardSummary } from '../services/dashboardService';

import './Dashboard.css';

function Dashboard() {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function loadDashboard() {
            try {
                const data = await getDashboardSummary();
                setDashboardData(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadDashboard();
    }, []);

    const metrics = dashboardData?.metrics;

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

            {loading && <p>Loading dashboard data...</p>}

            {error && <p className="dashboard-error">{error}</p>}

            {!loading && !error && metrics && (
                <>
                    <div className="dashboard-stats">
                        <StatCard
                            type="candidates"
                            title="Total candidates"
                            value={metrics.totalCandidates}
                            change="Live"
                            description="in database"
                        />

                        <StatCard
                            type="jobs"
                            title="Open positions"
                            value={metrics.openRequisitions}
                            change="Live"
                            description="currently open"
                        />

                        <StatCard
                            type="interviews"
                            title="Interviews scheduled"
                            value={metrics.scheduledInterviews}
                            change="Live"
                            description="currently scheduled"
                        />

                        <StatCard
                            type="hired"
                            title="Successful hires"
                            value={metrics.successfulHires}
                            change="Live"
                            description="completed hires"
                        />
                    </div>

                    <div className="dashboard-main-grid">
                        <HiringPipeline pipeline={dashboardData.pipeline}  />
                        <ActivityFeed
                            activities={dashboardData.recentActivity}
                        />
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
                </>
            )}
        </div>
    );
}

export default Dashboard;