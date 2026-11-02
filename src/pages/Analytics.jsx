import { useEffect, useState } from "react";
import { Activity, BriefcaseBusiness, Clock3, Users } from "lucide-react";

import { getDashboardSummary } from "../services/dashboardService";

import "./Dashboard.css";
import "./Analytics.css";

const formatNumber = (value) => new Intl.NumberFormat("en-IN").format(value || 0);

const formatLabel = (value) =>
    value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());

function AnalyticsBar({ label, count, total }) {
    const percentage = total > 0 ? (count / total) * 100 : 0;

    return (
        <div className="analytics-bar-row">
            <div className="analytics-bar-label">
                <span>{formatLabel(label)}</span>
                <strong>{formatNumber(count)}</strong>
            </div>
            <div
                className="analytics-bar-track"
                role="meter"
                aria-label={`${formatLabel(label)} share`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Number(percentage.toFixed(1))}
            >
                <div
                    className="analytics-bar-fill"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

function MetricCard({ icon: Icon, label, value, description }) {
    return (
        <article className="analytics-metric-card">
            <div className="analytics-page-metric-label">
                <span>{label}</span>
                <Icon size={17} aria-hidden="true" />
            </div>
            <strong>{value}</strong>
            <small>{description}</small>
        </article>
    );
}

function Analytics() {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadAnalytics() {
            try {
                const data = await getDashboardSummary();
                if (!cancelled) {
                    setDashboardData(data);
                    setError("");
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError.message || "Failed to load analytics.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadAnalytics();
        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return <div className="analytics-page-state" role="status">Loading hiring analytics...</div>;
    }

    if (error) {
        return (
            <div className="analytics-page-state analytics-page-error" role="alert">
                <p>{error}</p>
                <button type="button" onClick={() => window.location.reload()}>
                    Try again
                </button>
            </div>
        );
    }

    if (!dashboardData) {
        return <div className="analytics-page-state">No analytics data is available.</div>;
    }

    const { metrics, analytics } = dashboardData;
    const applicationTotal = analytics.hiringFunnel.reduce(
        (total, stage) => total + stage.count,
        0,
    );
    const requisitionTotal = Object.values(analytics.requisitions).reduce(
        (total, count) => total + count,
        0,
    );
    const interviewTotal = Object.values(analytics.interviews).reduce(
        (total, count) => total + count,
        0,
    );
    const respondedOffers = analytics.offers.accepted + analytics.offers.rejected;
    const acceptanceRate = respondedOffers
        ? ((analytics.offers.accepted / respondedOffers) * 100).toFixed(1)
        : "0.0";
    const stagesForFunnel = analytics.hiringFunnel.filter(
        ({ stage }) => !["Rejected", "Withdrawn"].includes(stage),
    );

    return (
        <div className="analytics-page">
            <header className="analytics-page-heading">
                <div>
                    <span className="dashboard-eyebrow">INSIGHTS</span>
                    <h1>Hiring analytics</h1>
                    <p>
                        Live hiring funnel, cycle times, interview activity, and
                        offer outcomes from your workflow records.
                    </p>
                </div>
                <span className="analytics-live-label">Live database metrics</span>
            </header>

            <section className="analytics-page-metrics" aria-label="Hiring summary">
                <MetricCard
                    icon={Users}
                    label="Applications"
                    value={formatNumber(applicationTotal)}
                    description="All current application stages"
                />
                <MetricCard
                    icon={BriefcaseBusiness}
                    label="Open requisitions"
                    value={formatNumber(metrics.openRequisitions)}
                    description={`${formatNumber(requisitionTotal)} total requisitions`}
                />
                <MetricCard
                    icon={Activity}
                    label="Interviews"
                    value={formatNumber(interviewTotal)}
                    description={`${formatNumber(analytics.interviews.scheduled)} currently scheduled`}
                />
                <MetricCard
                    icon={Clock3}
                    label="Average time to hire"
                    value={`${analytics.averageTimeToHire} days`}
                    description="From application to recorded hire"
                />
            </section>

            <section className="analytics-two-column">
                <article className="analytics-panel">
                    <div className="analytics-panel-heading">
                        <div>
                            <h2>Application funnel</h2>
                            <p>Current application counts by active or hired stage</p>
                        </div>
                        <span>{formatNumber(applicationTotal)} applications</span>
                    </div>
                    <div className="analytics-bars">
                        {stagesForFunnel.map(({ stage, count }) => (
                            <AnalyticsBar
                                key={stage}
                                label={stage}
                                count={count}
                                total={applicationTotal}
                            />
                        ))}
                    </div>
                    <p className="analytics-page-note">
                        Rejected: {formatNumber(analytics.hiringFunnel.find(({ stage }) => stage === "Rejected")?.count)}
                        <span aria-hidden="true"> · </span>
                        Withdrawn: {formatNumber(analytics.hiringFunnel.find(({ stage }) => stage === "Withdrawn")?.count)}
                    </p>
                </article>

                <article className="analytics-panel">
                    <div className="analytics-panel-heading">
                        <div>
                            <h2>Offer outcomes</h2>
                            <p>Approval workload and candidate responses</p>
                        </div>
                    </div>
                    <div className="analytics-page-outcomes">
                        <div>
                            <span>Offers created</span>
                            <strong>{formatNumber(analytics.offers.total)}</strong>
                        </div>
                        <div>
                            <span>Pending approvals</span>
                            <strong>{formatNumber(analytics.offers.pendingApprovals)}</strong>
                        </div>
                        <div>
                            <span>Approval rate</span>
                            <strong>{analytics.offers.approvalRate}%</strong>
                        </div>
                        <div>
                            <span>Offer acceptance</span>
                            <strong>{acceptanceRate}%</strong>
                            <small>Of accepted or rejected responses</small>
                        </div>
                        <div>
                            <span>Accepted</span>
                            <strong>{formatNumber(analytics.offers.accepted)}</strong>
                        </div>
                        <div>
                            <span>Rejected</span>
                            <strong>{formatNumber(analytics.offers.rejected)}</strong>
                        </div>
                    </div>
                </article>
            </section>

            <section className="analytics-two-column">
                <article className="analytics-panel">
                    <div className="analytics-panel-heading">
                        <div>
                            <h2>Requisition status</h2>
                            <p>Current distribution of requisitions</p>
                        </div>
                        <span>{formatNumber(requisitionTotal)} total</span>
                    </div>
                    <div className="analytics-bars">
                        {Object.entries(analytics.requisitions).map(([status, count]) => (
                            <AnalyticsBar
                                key={status}
                                label={status}
                                count={count}
                                total={requisitionTotal}
                            />
                        ))}
                    </div>
                </article>

                <article className="analytics-panel">
                    <div className="analytics-panel-heading">
                        <div>
                            <h2>Interview activity</h2>
                            <p>{formatNumber(interviewTotal)} interviews by current status</p>
                        </div>
                    </div>
                    <div className="analytics-bars">
                        {Object.entries(analytics.interviews).map(([status, count]) => (
                            <AnalyticsBar
                                key={status}
                                label={status}
                                count={count}
                                total={interviewTotal}
                            />
                        ))}
                    </div>
                </article>
            </section>

            <section className="analytics-two-column">
                <article className="analytics-panel">
                    <div className="analytics-panel-heading">
                        <div>
                            <h2>Time in each stage</h2>
                            <p>Average duration from recorded stage events</p>
                        </div>
                    </div>
                    {analytics.averageStageDuration.length > 0 ? (
                        <div className="stage-duration-list">
                            {analytics.averageStageDuration.map((item) => (
                                <div className="stage-duration-item" key={item.stage}>
                                    <div>
                                        <strong>{formatLabel(item.stage)}</strong>
                                        <small>{formatNumber(item.applications)} recorded intervals</small>
                                    </div>
                                    <span>{item.averageDays} days</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="analytics-page-empty">No stage-duration history is available yet.</p>
                    )}
                </article>

                <article className="analytics-panel">
                    <div className="analytics-panel-heading">
                        <div>
                            <h2>Hiring-manager activity</h2>
                            <p>Applications and hires across assigned requisitions</p>
                        </div>
                    </div>
                    <div className="analytics-table-wrapper">
                        <table className="analytics-table">
                            <thead>
                                <tr>
                                    <th>Manager</th>
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
                                        <td colSpan="4">No manager activity is available yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </article>
            </section>
        </div>
    );
}

export default Analytics;
