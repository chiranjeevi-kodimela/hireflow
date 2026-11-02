
import { useEffect, useState } from "react";
import { Plus, BriefcaseBusiness } from "lucide-react";

import StatCard from "../components/dashboard/StatCard";
import HiringPipeline from "../components/dashboard/HiringPipeline";
import ActivityFeed from "../components/dashboard/ActivityFeed";

import { getDashboardSummary } from "../services/dashboardService";

import "./Dashboard.css";

const formatNumber = (value) =>
    new Intl.NumberFormat("en-IN").format(value || 0);

function MetricCard({ label, value, description }) {
    return (
        <div className="analytics-metric-card">
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{description}</small>
        </div>
    );
}

function AnalyticsBar({ label, count, total }) {
    const percentage = total > 0 ? (count / total) * 100 : 0;

    return (
        <div className="analytics-bar-row">
            <div className="analytics-bar-label">
                <span>{label}</span>
                <strong>{formatNumber(count)}</strong>
            </div>

            <div className="analytics-bar-track">
                <div
                    className="analytics-bar-fill"
                    style={{
                        width: `${Math.max(percentage, count > 0 ? 1 : 0)}%`,
                    }}
                />
            </div>
        </div>
    );
}

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
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load dashboard");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadDashboard();

        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return <div className="dashboard">Loading dashboard data...</div>;
    }

    if (error) {
        return <div className="dashboard dashboard-error">{error}</div>;
    }

    if (!dashboardData) {
        return <div className="dashboard">No dashboard data available.</div>;
    }

    const {
        metrics,
        pipeline,
        recentActivity,
        analytics,
    } = dashboardData;

    const funnelTotal = analytics.hiringFunnel.reduce(
        (sum, item) => sum + item.count,
        0
    );

    const requisitionTotal = Object.values(analytics.requisitions).reduce(
        (sum, value) => sum + value,
        0
    );

    const offerMetrics = analytics.offers;
    const interviewMetrics = analytics.interviews;

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

                <button
                    className="create-job-button"
                    onClick={() => {
                        window.location.href = "/jobs";
                    }}
                >
                    <Plus size={17} />
                    Create requisition
                </button>
            </div>

            {/* Main statistics */}
            <div className="dashboard-stats">
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
            </div>

            {/* Pipeline and activity */}
            <div className="dashboard-main-grid">
                <HiringPipeline pipeline={pipeline} />
                <ActivityFeed activities={recentActivity} />
            </div>

            {/* Recruitment analytics */}
            <section className="analytics-section">
                <div className="analytics-section-heading">
                    <div>
                        <span className="dashboard-eyebrow">
                            PERFORMANCE
                        </span>
                        <h2>Recruitment analytics</h2>
                    </div>

                    <span className="analytics-live-label">
                        Live database metrics
                    </span>
                </div>

                <div className="analytics-metric-grid">
                    <MetricCard
                        label="Average time to hire"
                        value={`${analytics.averageTimeToHire} days`}
                        description="Based on completed hires"
                    />

                    <MetricCard
                        label="Total offers"
                        value={formatNumber(offerMetrics.total)}
                        description="All offer records"
                    />

                    <MetricCard
                        label="Pending approvals"
                        value={formatNumber(offerMetrics.pendingApprovals)}
                        description="Awaiting approver decisions"
                    />

                    <MetricCard
                        label="Approved offers"
                        value={formatNumber(offerMetrics.approved)}
                        description={`${offerMetrics.approvalRate}% approval rate`}
                    />
                </div>
            </section>

            {/* Hiring funnel and offer performance */}
            <div className="analytics-two-column">
                <section className="analytics-panel">
                    <div className="analytics-panel-heading">
                        <div>
                            <h3>Hiring funnel</h3>
                            <p>
                                Applications grouped by their current stage
                            </p>
                        </div>

                        <span>{formatNumber(funnelTotal)} records</span>
                    </div>

                    <div className="analytics-bars">
                        {analytics.hiringFunnel.map((item) => (
                            <AnalyticsBar
                                key={item.stage}
                                label={item.stage}
                                count={item.count}
                                total={funnelTotal}
                            />
                        ))}
                    </div>
                </section>

                <section className="analytics-panel">
                    <div className="analytics-panel-heading">
                        <div>
                            <h3>Offer performance</h3>
                            <p>Approval decisions across offers</p>
                        </div>
                    </div>

                    <div className="offer-performance-grid">
                        <div>
                            <span>Approval rate</span>
                            <strong>{offerMetrics.approvalRate}%</strong>
                            <small>Approved decisions</small>
                        </div>

                        <div>
                            <span>Approval rejection rate</span>
                            <strong>
                                {offerMetrics.approvalRejectionRate}%
                            </strong>
                            <small>Rejected approval decisions</small>
                        </div>

                        <div>
                            <span>Pending approval</span>
                            <strong>{offerMetrics.pendingApproval}</strong>
                            <small>Offers awaiting approval</small>
                        </div>

                        <div>
                            <span>Accepted offers</span>
                            <strong>{offerMetrics.accepted}</strong>
                            <small>Candidate acceptances</small>
                        </div>
                    </div>
                </section>
            </div>

            {/* Interview status */}
            <section className="analytics-panel">
                <div className="analytics-panel-heading">
                    <div>
                        <h3>Interview status</h3>
                        <p>Current interview distribution</p>
                    </div>
                </div>

                <div className="offer-performance-grid">
                    {Object.entries(interviewMetrics).map(([status, count]) => (
                        <div key={status}>
                            <span>
                                {status.replace(/([A-Z])/g, " $1")}
                            </span>
                            <strong>{formatNumber(count)}</strong>
                            <small>Interviews</small>
                        </div>
                    ))}
                </div>
            </section>

            {/* Requisition and stage duration */}
            <div className="analytics-two-column">
                <section className="analytics-panel">
                    <div className="analytics-panel-heading">
                        <div>
                            <h3>Requisition status</h3>
                            <p>Distribution of all requisitions</p>
                        </div>

                        <span>{formatNumber(requisitionTotal)} total</span>
                    </div>

                    <div className="analytics-bars">
                        {Object.entries(analytics.requisitions).map(
                            ([status, count]) => (
                                <AnalyticsBar
                                    key={status}
                                    label={status.replace(/([A-Z])/g, " $1")}
                                    count={count}
                                    total={requisitionTotal}
                                />
                            )
                        )}
                    </div>
                </section>

                <section className="analytics-panel">
                    <div className="analytics-panel-heading">
                        <div>
                            <h3>Stage duration</h3>
                            <p>Average recorded time per stage</p>
                        </div>
                    </div>

                    <div className="stage-duration-list">
                        {analytics.averageStageDuration.map((item) => (
                            <div
                                className="stage-duration-item"
                                key={item.stage}
                            >
                                <div>
                                    <strong>{item.stage}</strong>
                                    <small>
                                        {formatNumber(item.applications)} recorded
                                        intervals
                                    </small>
                                </div>

                                <span>{item.averageDays} days</span>
                            </div>
                        ))}

                        {analytics.averageStageDuration.length === 0 && (
                            <p>No stage duration data available.</p>
                        )}
                    </div>
                </section>
            </div>

            {/* Hiring manager performance */}
            <section className="analytics-panel manager-panel">
                <div className="analytics-panel-heading">
                    <div>
                        <h3>Hiring-manager performance</h3>
                        <p>
                            Applications and hires across assigned requisitions
                        </p>
                    </div>
                </div>

                <div className="analytics-table-wrapper">
                    <table className="analytics-table">
                        <thead>
                            <tr>
                                <th>Hiring manager</th>
                                <th>Requisitions</th>
                                <th>Applications</th>
                                <th>Hires</th>
                            </tr>
                        </thead>

                        <tbody>
                            {analytics.hiringManagers.map((manager) => (
                                <tr key={manager.hiringManagerId}>
                                    <td>{manager.name}</td>
                                    <td>{formatNumber(manager.requisitions)}</td>
                                    <td>{formatNumber(manager.applications)}</td>
                                    <td>{formatNumber(manager.hires)}</td>
                                </tr>
                            ))}

                            {analytics.hiringManagers.length === 0 && (
                                <tr>
                                    <td colSpan="4">
                                        No hiring-manager data available.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Bottom summary */}
            <div className="dashboard-bottom">
                <div className="bottom-heading">
                    <h3>Recruitment snapshot</h3>

                    <span>
                        <BriefcaseBusiness size={14} />
                        Hiring operations
                    </span>
                </div>

                <p>
                    Monitor application progression, interview activity,
                    offer decisions, requisition distribution, and
                    hiring-manager performance from one workspace.
                </p>
            </div>
        </div>
    );
}

export default Dashboard;
