
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    createOffer,
    decideApproval,
    getOffers,
    getEmployees,
    sendOffer,
    respondToOffer,
    withdrawOffer,
} from "../services/offerService";
import { getApplications } from "../services/applicationService";
import "./Offers.css";

const money = (value) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(value || 0));

const statusClass = (status = "") =>
    `offer-status offer-status--${status.toLowerCase().replaceAll("_", "-")}`;

const ACTIVE_STATUSES = [
    "DRAFT",
    "PENDING_APPROVAL",
    "APPROVED",
    "SENT",
    "ACCEPTED",
];

export default function Offers() {
    const [offers, setOffers] = useState([]);
    const [applications, setApplications] = useState([]);
    const [employees, setEmployees] = useState([]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const [applicationId, setApplicationId] = useState("");
    const [baseSalary, setBaseSalary] = useState("");
    const [bonus, setBonus] = useState("");

    const [activeApproval, setActiveApproval] = useState(null);
    const [comments, setComments] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const [offerData, applicationData, employeeData] = await Promise.all([
                getOffers(),
                getApplications(),
                getEmployees(),
            ]);

            setOffers(Array.isArray(offerData) ? offerData : []);
            setApplications(Array.isArray(applicationData) ? applicationData : []);
            setEmployees(
                (Array.isArray(employeeData) ? employeeData : []).filter(
                    (employee) => employee.isActive && employee.role === "APPROVER"
                )
            );
        } catch (err) {
            setError(err.message || "Unable to load offer data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function fetchInitialData() {
            try {
                const [offerData, applicationData, employeeData] = await Promise.all([
                    getOffers(),
                    getApplications(),
                    getEmployees(),
                ]);

                if (cancelled) return;

                setOffers(Array.isArray(offerData) ? offerData : []);
                setApplications(Array.isArray(applicationData) ? applicationData : []);
                setEmployees(
                    (Array.isArray(employeeData) ? employeeData : []).filter(
                        (employee) => employee.isActive && employee.role === "APPROVER"
                    )
                );
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Unable to load offer data.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchInitialData();

        return () => {
            cancelled = true;
        };
    }, []);
    const eligibleApplications = useMemo(
        () =>
            applications.filter(
                (application) =>
                    application.status === "ACTIVE" &&
                    application.currentStage === "OFFER"
            ),
        [applications]
    );

    const existingApplicationIds = useMemo(
        () =>
            new Set(
                offers
                    .filter((offer) => ACTIVE_STATUSES.includes(offer.status))
                    .map((offer) => offer.applicationId)
            ),
        [offers]
    );

    const createableApplications = eligibleApplications.filter(
        (application) => !existingApplicationIds.has(application.applicationId)
    );

    const selectedApplication = eligibleApplications.find(
        (application) => application.applicationId === applicationId
    );

    const handleCreate = async (event) => {
        event.preventDefault();
        setError("");
        setNotice("");

        const salary = Number(baseSalary);
        const bonusValue = bonus === "" ? undefined : Number(bonus);

        if (!applicationId || !Number.isFinite(salary) || salary <= 0) {
            setError("Select an application and enter a valid base salary.");
            return;
        }

        if (
            bonus !== "" &&
            (!Number.isFinite(bonusValue) || bonusValue < 0)
        ) {
            setError("Bonus must be zero or greater.");
            return;
        }

        setSubmitting(true);

        try {
            await createOffer({
                applicationId,
                baseSalary: salary,
                ...(bonusValue !== undefined ? { bonus: bonusValue } : {}),
            });

            setApplicationId("");
            setBaseSalary("");
            setBonus("");
            setNotice("Offer created and sent for approval.");
            await loadData();
        } catch (err) {
            setError(err.message || "Unable to create the offer.");
        } finally {
            setSubmitting(false);
        }
    };

    const openDecision = (approval, decision) => {
        setError("");
        setNotice("");
        setActiveApproval({ ...approval, decision });
        setComments("");
    };

    const handleDecision = async (event) => {
        event.preventDefault();

        if (!activeApproval) return;

        setSubmitting(true);
        setError("");
        setNotice("");

        try {
            await decideApproval(activeApproval.approvalId, {
                approverId: activeApproval.approverId,
                decision: activeApproval.decision,
                comments: comments.trim() || undefined,
            });

            setActiveApproval(null);
            setComments("");
            setNotice("Approval decision recorded.");
            await loadData();
        } catch (err) {
            setError(err.message || "Unable to record the decision.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSend = async (offer) => {
        if (!window.confirm(`Send offer ${offer.offerId} to the candidate?`)) {
            return;
        }

        setSubmitting(true);
        setError("");
        setNotice("");

        try {
            await sendOffer(offer.offerId);
            setNotice("Offer marked as sent.");
            await loadData();
        } catch (err) {
            setError(err.message || "Unable to send offer.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleResponse = async (offer, decision) => {
        const label = decision === "ACCEPTED" ? "accept" : "reject";

        if (!window.confirm(`Record the candidate's decision to ${label} this offer?`)) {
            return;
        }

        setSubmitting(true);
        setError("");
        setNotice("");

        try {
            await respondToOffer(offer.offerId, { decision });
            setNotice(`Offer marked as ${decision.toLowerCase()}.`);
            await loadData();
        } catch (err) {
            setError(err.message || "Unable to record offer response.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleWithdraw = async (offer) => {
        const reason = window.prompt("Enter the reason for withdrawing this offer:");

        if (!reason?.trim()) return;

        setSubmitting(true);
        setError("");
        setNotice("");

        try {
            await withdrawOffer(offer.offerId, reason.trim());
            setNotice("Offer withdrawn.");
            await loadData();
        } catch (err) {
            setError(err.message || "Unable to withdraw offer.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="offers-page">
            <header className="offers-header">
                <div>
                    <p className="offers-eyebrow">RECRUITMENT WORKSPACE</p>
                    <h1>Offers</h1>
                    <p className="offers-subtitle">
                        Create compensation offers and manage approval decisions.
                    </p>
                </div>

                <button
                    className="offers-refresh"
                    onClick={loadData}
                    disabled={loading || submitting}
                >
                    Refresh
                </button>
            </header>

            {error && <div className="offers-alert offers-alert--error">{error}</div>}
            {notice && (
                <div className="offers-alert offers-alert--success">{notice}</div>
            )}

            <section className="offers-create">
                <div className="offers-section-heading">
                    <div>
                        <h2>Create an offer</h2>
                        <p>Only active applications at the Offer stage are eligible.</p>
                    </div>
                </div>

                <form className="offers-form" onSubmit={handleCreate}>
                    <label>
                        Application
                        <select
                            value={applicationId}
                            onChange={(event) => setApplicationId(event.target.value)}
                            required
                        >
                            <option value="">Select application</option>

                            {createableApplications.map((application) => (
                                <option
                                    key={application.applicationId}
                                    value={application.applicationId}
                                >
                                    {application.applicationId} —{" "}
                                    {application.candidate?.fullName ||
                                        application.candidate?.name ||
                                        application.candidateId}{" "}
                                    / {application.requisition?.title || application.requisitionId}
                                </option>
                            ))}
                        </select>
                    </label>

                    {selectedApplication && (
                        <div className="offers-band">
                            Compensation band:{" "}
                            <strong>
                                {money(selectedApplication.requisition?.minSalary)} –{" "}
                                {money(selectedApplication.requisition?.maxSalary)}
                            </strong>
                        </div>
                    )}

                    <label>
                        Base salary (INR)
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={baseSalary}
                            onChange={(event) => setBaseSalary(event.target.value)}
                            placeholder="e.g. 1200000"
                            required
                        />
                    </label>

                    <label>
                        Bonus (INR, optional)
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={bonus}
                            onChange={(event) => setBonus(event.target.value)}
                            placeholder="e.g. 100000"
                        />
                    </label>

                    <button type="submit" disabled={submitting || loading}>
                        {submitting ? "Submitting..." : "Create offer"}
                    </button>
                </form>
            </section>

            <section className="offers-list-section">
                <div className="offers-section-heading">
                    <div>
                        <h2>Offer pipeline</h2>
                        <p>{offers.length} offer records</p>
                    </div>
                </div>

                {loading ? (
                    <p className="offers-empty">Loading offers...</p>
                ) : offers.length === 0 ? (
                    <p className="offers-empty">No offers have been created yet.</p>
                ) : (
                    <div className="offers-list">
                        {offers.map((offer) => {
                            const candidate =
                                offer.application?.candidate?.fullName ||
                                offer.application?.candidate?.name ||
                                offer.application?.candidateId ||
                                offer.applicationId;

                            const requisition =
                                offer.application?.requisition?.title ||
                                offer.application?.requisition?.jobTitle ||
                                offer.application?.requisitionId ||
                                "Requisition";

                            const approvals = offer.approvals || [];
                            const approvedCount = approvals.filter(
                                (approval) => approval.status === "APPROVED"
                            ).length;

                            return (
                                <article className="offer-card" key={offer.offerId}>
                                    <div className="offer-card-top">
                                        <div>
                                            <p className="offer-id">
                                                {offer.offerId} · Version {offer.version}
                                            </p>
                                            <h3>{candidate}</h3>
                                            <p className="offer-role">{requisition}</p>
                                        </div>

                                        <span className={statusClass(offer.status)}>
                                            {offer.status?.replaceAll("_", " ")}
                                        </span>
                                    </div>

                                    <div className="offer-compensation">
                                        <div>
                                            <span>Base salary</span>
                                            <strong>{money(offer.baseSalary)}</strong>
                                        </div>
                                        <div>
                                            <span>Bonus</span>
                                            <strong>{money(offer.bonus)}</strong>
                                        </div>
                                        <div>
                                            <span>Currency</span>
                                            <strong>{offer.currency || "INR"}</strong>
                                        </div>
                                    </div>

                                    <div className="offer-approvals">
                                        <h4>Approval workflow</h4>

                                        <p>
                                            {approvedCount} of {approvals.length} approvals completed
                                        </p>

                                        {approvals.length ? (
                                            approvals.map((approval) => (
                                                <div
                                                    className="offer-approval-row"
                                                    key={approval.approvalId}
                                                >
                                                    <div>
                                                        <strong>
                                                            {approval.approver?.fullName ||
                                                                employees.find(
                                                                    (employee) =>
                                                                        employee.employeeId === approval.approverId
                                                                )?.fullName ||
                                                                approval.approverId}
                                                        </strong>

                                                        <span className={statusClass(approval.status)}>
                                                            {approval.status}
                                                        </span>

                                                        {approval.comments && (
                                                            <p className="offer-approval-comment">
                                                                {approval.comments}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {approval.status === "PENDING" && (
                                                        <div className="offer-approval-actions">
                                                            <button
                                                                type="button"
                                                                className="offer-approve"
                                                                disabled={submitting}
                                                                onClick={() =>
                                                                    openDecision(approval, "APPROVED")
                                                                }
                                                            >
                                                                Approve
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="offer-reject"
                                                                disabled={submitting}
                                                                onClick={() =>
                                                                    openDecision(approval, "REJECTED")
                                                                }
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="offers-empty">No approval records.</p>
                                        )}
                                    </div>

                                    <div className="offer-approval-actions">
                                        {offer.status === "APPROVED" && (
                                            <button
                                                type="button"
                                                className="offer-approve"
                                                disabled={submitting}
                                                onClick={() => handleSend(offer)}
                                            >
                                                Mark as sent
                                            </button>
                                        )}

                                        {offer.status === "SENT" && (
                                            <>
                                                <button
                                                    type="button"
                                                    className="offer-approve"
                                                    disabled={submitting}
                                                    onClick={() => handleResponse(offer, "ACCEPTED")}
                                                >
                                                    Record acceptance
                                                </button>

                                                <button
                                                    type="button"
                                                    className="offer-reject"
                                                    disabled={submitting}
                                                    onClick={() => handleResponse(offer, "REJECTED")}
                                                >
                                                    Record rejection
                                                </button>
                                            </>
                                        )}

                                        {["APPROVED", "SENT"].includes(offer.status) && (
                                            <button
                                                type="button"
                                                className="offer-reject"
                                                disabled={submitting}
                                                onClick={() => handleWithdraw(offer)}
                                            >
                                                Withdraw offer
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {activeApproval && (
                <div
                    className="offers-modal-backdrop"
                    role="presentation"
                    onClick={() => !submitting && setActiveApproval(null)}
                >
                    <section
                        className="offers-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="approval-modal-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h2 id="approval-modal-title">
                            {activeApproval.decision === "APPROVED"
                                ? "Approve offer"
                                : "Reject offer"}
                        </h2>

                        <p>
                            Approval ID: <strong>{activeApproval.approvalId}</strong>
                        </p>

                        <p>
                            Assigned approver:{" "}
                            <strong>
                                {employees.find(
                                    (employee) =>
                                        employee.employeeId === activeApproval.approverId
                                )?.fullName || activeApproval.approverId}
                            </strong>
                        </p>

                        <form onSubmit={handleDecision}>
                            <label>
                                Comments
                                <textarea
                                    value={comments}
                                    onChange={(event) => setComments(event.target.value)}
                                    placeholder="Add decision notes (optional)"
                                    rows="3"
                                />
                            </label>

                            <div className="offers-modal-actions">
                                <button
                                    type="button"
                                    className="offers-cancel"
                                    disabled={submitting}
                                    onClick={() => setActiveApproval(null)}
                                >
                                    Cancel
                                </button>

                                <button type="submit" disabled={submitting}>
                                    {submitting ? "Saving..." : "Confirm decision"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </main>
    );
}
