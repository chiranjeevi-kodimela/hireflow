import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, Plus } from "lucide-react";
import { Link } from "react-router-dom";

import StatCard from "../components/dashboard/StatCard";
import HiringPipeline from "../components/dashboard/HiringPipeline";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import { getDashboardSummary } from "../services/dashboardService";

import "./Dashboard.css";

const formatNumber = (value) =>
    new Intl.NumberFormat("en-IN").format(value || 0);

function Dashboard() {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadDashboard() {
            try {
                const data = await getDashboardSummary();

                if (!cancelled) {
                    setDashboardData(data);
                    setError("");
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError.message || "Failed to load dashboard");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadDashboard();

        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return <div className="dashboard dashboard-state" role="status">Loading overview...</div>;
    }

    if (error) {
        return <div className="dashboard dashboard-state dashboard-error" role="alert">{error}</div>;
    }

    if (!dashboardData) {
        return <div className="dashboard dashboard-state">No dashboard data available.</div>;
    }

    const { metrics, pipeline, recentActivity } = dashboardData;

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div>
                    <span className="dashboard-eyebrow">RECRUITMENT OVERVIEW</span>
                    <h1>Hiring at a glance</h1>
                    <p>Monitor current hiring activity and recent updates.</p>
                </div>

                <Link className="create-job-button" to="/jobs">
                    <Plus size={17} />
                    Create requisition
                </Link>
            </header>

            <section className="dashboard-stats" aria-label="Hiring summary">
                <StatCard
                    type="candidates"
                    title="Total candidates"
                    value={formatNumber(metrics.totalCandidates)}
                    change="Live"
                    description="in database"
                />
                <StatCard
                    type="jobs"
                    title="Open positions"
                    value={formatNumber(metrics.openRequisitions)}
                    change="Live"
                    description="currently open"
                />
                <StatCard
                    type="interviews"
                    title="Interviews scheduled"
                    value={formatNumber(metrics.scheduledInterviews)}
                    change="Live"
                    description="currently scheduled"
                />
                <StatCard
                    type="hired"
                    title="Successful hires"
                    value={formatNumber(metrics.successfulHires)}
                    change="Live"
                    description="completed hires"
                />
            </section>

            <section className="dashboard-main-grid" aria-label="Hiring activity">
                <HiringPipeline pipeline={pipeline} />
                <ActivityFeed activities={recentActivity} />
            </section>

            <Link className="dashboard-analytics-link" to="/analytics">
                <span className="dashboard-analytics-icon" aria-hidden="true">
                    <BriefcaseBusiness size={18} />
                </span>
                <span>
                    <strong>Need the bigger picture?</strong>
                    <small>Explore funnel trends, cycle times, offer outcomes, and manager activity.</small>
                </span>
                <ArrowRight size={18} aria-hidden="true" />
            </Link>
        </div>
    );
}

export default Dashboard;
