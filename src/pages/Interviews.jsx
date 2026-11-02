
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    getInterviews,
    createInterview,
    getEmployees,
    getInterviewPanels,
    completeInterview,
    cancelInterview,
    rescheduleInterview,
} from "../services/interviewService";
import { getApplications } from "../services/applicationService";
import "./Interviews.css";

const interviewTypes = ["SCREENING", "TECHNICAL", "MANAGERIAL", "HR"];

function toLocalInput(value) {
    const date = new Date(value);
    const offset = date.getTimezoneOffset();

    return new Date(date.getTime() - offset * 60000)
        .toISOString()
        .slice(0, 16);
}

function formatDate(value) {
    return value ? new Date(value).toLocaleString() : "—";
}

function getActorId(interview) {
    const lead = interview.participants?.find(
        (participant) => participant.role === "LEAD"
    );

    return lead?.employeeId || lead?.employee?.id;
}

function getEmployeeName(employee) {
    return employee?.fullName || employee?.name || "Unknown";
}

function getCandidateName(interview) {
    const candidate = interview.application?.candidate;

    return candidate
        ? `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim()
        : "Unknown candidate";
}

function Interviews() {
    const [interviews, setInterviews] = useState([]);
    const [applications, setApplications] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [panels, setPanels] = useState([]);

    const [filters, setFilters] = useState({
        status: "",
        interviewType: "",
    });

    const [view, setView] = useState("list");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [form, setForm] = useState({
        applicationId: "",
        panelId: "",
        interviewType: "SCREENING",
        startTime: "",
        endTime: "",
        leadInterviewer: "",
        panelist: "",
    });

    const selectedApplication = applications.find(
        (application) => application.applicationId === form.applicationId
    );

    const loadInterviews = useCallback(async (currentFilters = {}) => {
        try {
            const data = await getInterviews(currentFilters);
            setInterviews(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || "Failed to load interviews");
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial page loading
    useEffect(() => {
        let cancelled = false;

        async function loadInitialData() {
            try {
                const [interviewData, applicationData, employeeData] =
                    await Promise.all([
                        getInterviews(),
                        getApplications(),
                        getEmployees(),
                    ]);

                if (cancelled) return;

                setInterviews(Array.isArray(interviewData) ? interviewData : []);

                setApplications(
                    (Array.isArray(applicationData) ? applicationData : []).filter(
                        (application) =>
                            application.status === "ACTIVE" &&
                            ["SCREENING", "TECHNICAL", "MANAGERIAL", "HR"].includes(
                                application.currentStage
                            )
                    )
                );

                setEmployees(Array.isArray(employeeData) ? employeeData : []);
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load scheduling data");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadInitialData();

        return () => {
            cancelled = true;
        };
    }, []);

    // Load panels for selected requisition
    useEffect(() => {
        let cancelled = false;

        async function loadPanels() {
            if (!selectedApplication?.requisitionId) return;

            try {
                const data = await getInterviewPanels(
                    selectedApplication.requisitionId
                );

                if (!cancelled) {
                    setPanels(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                if (!cancelled) {
                    setPanels([]);
                    setError(err.message || "Failed to load interview panels");
                }
            }
        }

        loadPanels();

        return () => {
            cancelled = true;
        };
    }, [selectedApplication?.requisitionId]);

    const handleFilterChange = (event) => {
        const { name, value } = event.target;

        const updatedFilters = {
            ...filters,
            [name]: value,
        };

        setFilters(updatedFilters);
        setLoading(true);
        setError("");

        loadInterviews(updatedFilters);
    };

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
            ...(name === "applicationId" ? { panelId: "" } : {}),
        }));

        if (name === "applicationId") {
            setPanels([]);
        }
    };

    const handleSchedule = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (
            !form.applicationId ||
            !form.panelId ||
            !form.startTime ||
            !form.endTime ||
            !form.leadInterviewer
        ) {
            setError("Please complete all required fields.");
            return;
        }

        const start = new Date(form.startTime);
        const end = new Date(form.endTime);

        if (start <= new Date()) {
            setError("Interview must be scheduled for a future time.");
            return;
        }

        if (start >= end) {
            setError("End time must be later than start time.");
            return;
        }

        const participants = [
            {
                employeeId: form.leadInterviewer,
                role: "LEAD",
            },
        ];

        if (form.panelist && form.panelist !== form.leadInterviewer) {
            participants.push({
                employeeId: form.panelist,
                role: "PANELIST",
            });
        }

        try {
            setSaving(true);

            await createInterview({
                applicationId: form.applicationId,
                panelId: form.panelId,
                interviewType: form.interviewType,
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                participants,
            });

            setSuccess("Interview scheduled successfully.");

            setForm({
                applicationId: "",
                panelId: "",
                interviewType: "SCREENING",
                startTime: "",
                endTime: "",
                leadInterviewer: "",
                panelist: "",
            });

            setPanels([]);
            await loadInterviews(filters);
        } catch (err) {
            setError(err.message || "Unable to schedule interview.");
        } finally {
            setSaving(false);
        }
    };

    const handleComplete = async (interview) => {
        const actorId = getActorId(interview);

        if (!actorId) {
            setError("No lead interviewer is assigned to this interview.");
            return;
        }

        if (!window.confirm("Mark this interview as completed?")) return;

        try {
            setError("");
            setSuccess("");

            await completeInterview(interview.interviewId, {
                completedById: actorId,
            });

            setSuccess("Interview marked as completed.");
            await loadInterviews(filters);
        } catch (err) {
            setError(err.message || "Unable to complete interview.");
        }
    };

    const handleCancel = async (interview) => {
        const actorId = getActorId(interview);

        if (!actorId) {
            setError("No lead interviewer is assigned to this interview.");
            return;
        }

        const reason = window.prompt("Enter the cancellation reason:");

        if (!reason?.trim()) return;

        try {
            setError("");
            setSuccess("");

            await cancelInterview(interview.interviewId, {
                cancelledById: actorId,
                reason: reason.trim(),
            });

            setSuccess("Interview cancelled.");
            await loadInterviews(filters);
        } catch (err) {
            setError(err.message || "Unable to cancel interview.");
        }
    };

    const handleReschedule = async (interview) => {
        const actorId = getActorId(interview);

        if (!actorId) {
            setError("No lead interviewer is assigned to this interview.");
            return;
        }

        const newStart = window.prompt(
            "New start time (YYYY-MM-DDTHH:mm):",
            toLocalInput(interview.startTime)
        );

        if (!newStart) return;

        const newEnd = window.prompt(
            "New end time (YYYY-MM-DDTHH:mm):",
            toLocalInput(interview.endTime)
        );

        if (!newEnd) return;

        const reason = window.prompt("Enter the rescheduling reason:");

        if (!reason?.trim()) return;

        const start = new Date(newStart);
        const end = new Date(newEnd);

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime()) ||
            start <= new Date() ||
            start >= end
        ) {
            setError("Enter valid future start and end times.");
            return;
        }

        try {
            setError("");
            setSuccess("");

            await rescheduleInterview(interview.interviewId, {
                rescheduledById: actorId,
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                reason: reason.trim(),
            });

            setSuccess("Interview rescheduled successfully.");
            await loadInterviews(filters);
        } catch (err) {
            setError(err.message || "Unable to reschedule interview.");
        }
    };

    const groupedInterviews = useMemo(() => {
        return interviews.reduce((groups, interview) => {
            const date = new Date(interview.startTime).toLocaleDateString();

            if (!groups[date]) groups[date] = [];

            groups[date].push(interview);
            return groups;
        }, {});
    }, [interviews]);

    const renderInterview = (interview) => {
        const isScheduled = interview.status === "SCHEDULED";

        return (
            <tr key={interview.interviewId}>
                <td>{getCandidateName(interview)}</td>
                <td>{interview.application?.requisition?.title || "—"}</td>
                <td>{interview.interviewType}</td>
                <td>{interview.panel?.name || "—"}</td>
                <td>{formatDate(interview.startTime)}</td>
                <td>
                    <span
                        className={`interview-status status-${(
                            interview.status || ""
                        ).toLowerCase()}`}
                    >
                        {interview.status}
                    </span>
                </td>
                <td>
                    {isScheduled && (
                        <div className="interview-actions">
                            <button
                                type="button"
                                onClick={() => handleComplete(interview)}
                            >
                                Complete
                            </button>

                            <button
                                type="button"
                                onClick={() => handleReschedule(interview)}
                            >
                                Reschedule
                            </button>

                            <button
                                type="button"
                                className="cancel-action"
                                onClick={() => handleCancel(interview)}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </td>
            </tr>
        );
    };

    return (
        <div className="interviews-page">
            <section className="interview-form-card">
                <h2>Schedule Interview</h2>

                <form className="interview-form" onSubmit={handleSchedule}>
                    <label>
                        Application
                        <select
                            name="applicationId"
                            value={form.applicationId}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select application</option>

                            {applications.map((application) => (
                                <option
                                    key={application.applicationId}
                                    value={application.applicationId}
                                >
                                    {application.applicationId} —{" "}
                                    {application.candidate?.firstName}{" "}
                                    {application.candidate?.lastName}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Interview Panel
                        <select
                            name="panelId"
                            value={form.panelId}
                            onChange={handleChange}
                            required
                            disabled={!form.applicationId}
                        >
                            <option value="">Select panel</option>

                            {panels.map((panel) => (
                                <option key={panel.panelId} value={panel.panelId}>
                                    {panel.name || panel.panelId}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Interview Type
                        <select
                            name="interviewType"
                            value={form.interviewType}
                            onChange={handleChange}
                        >
                            {interviewTypes.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Lead Interviewer
                        <select
                            name="leadInterviewer"
                            value={form.leadInterviewer}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select lead interviewer</option>

                            {employees.map((employee) => (
                                <option
                                    key={employee.employeeId}
                                    value={employee.employeeId}
                                >
                                    {getEmployeeName(employee)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Additional Panelist (Optional)
                        <select
                            name="panelist"
                            value={form.panelist}
                            onChange={handleChange}
                        >
                            <option value="">No additional panelist</option>

                            {employees
                                .filter(
                                    (employee) =>
                                        employee.employeeId !== form.leadInterviewer
                                )
                                .map((employee) => (
                                    <option
                                        key={employee.employeeId}
                                        value={employee.employeeId}
                                    >
                                        {getEmployeeName(employee)}
                                    </option>
                                ))}
                        </select>
                    </label>

                    <label>
                        Start Time
                        <input
                            type="datetime-local"
                            name="startTime"
                            value={form.startTime}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label>
                        End Time
                        <input
                            type="datetime-local"
                            name="endTime"
                            value={form.endTime}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <button type="submit" disabled={saving}>
                        {saving ? "Scheduling..." : "Schedule Interview"}
                    </button>
                </form>

                {error && <p className="interview-error">{error}</p>}
                {success && <p className="interview-success">{success}</p>}
            </section>

            <section className="interview-list-card">
                <div className="interview-list-header">
                    <div>
                        <h2>Interviews</h2>
                        <span>{interviews.length} interviews found</span>
                    </div>

                    <div className="interview-view-toggle">
                        <button
                            className={view === "list" ? "active" : ""}
                            onClick={() => setView("list")}
                            type="button"
                        >
                            List
                        </button>

                        <button
                            className={view === "calendar" ? "active" : ""}
                            onClick={() => setView("calendar")}
                            type="button"
                        >
                            Calendar
                        </button>
                    </div>
                </div>

                <div className="interview-filters">
                    <select
                        name="status"
                        value={filters.status}
                        onChange={handleFilterChange}
                    >
                        <option value="">All statuses</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>

                    <select
                        name="interviewType"
                        value={filters.interviewType}
                        onChange={handleFilterChange}
                    >
                        <option value="">All interview types</option>

                        {interviewTypes.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <p>Loading interviews...</p>
                ) : interviews.length === 0 ? (
                    <p className="empty-interviews">No interviews found.</p>
                ) : view === "list" ? (
                    <div className="interview-table-wrapper">
                        <table className="interview-table">
                            <thead>
                                <tr>
                                    <th>Candidate</th>
                                    <th>Position</th>
                                    <th>Type</th>
                                    <th>Panel</th>
                                    <th>Date & Time</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>{interviews.map(renderInterview)}</tbody>
                        </table>
                    </div>
                ) : (
                    <div className="interview-calendar">
                        {Object.entries(groupedInterviews).map(([date, items]) => (
                            <div className="calendar-day" key={date}>
                                <h3>{date}</h3>

                                {items.map((interview) => (
                                    <div
                                        className="calendar-interview"
                                        key={interview.interviewId}
                                    >
                                        <strong>{getCandidateName(interview)}</strong>
                                        <span>{interview.interviewType}</span>
                                        <span>{formatDate(interview.startTime)}</span>
                                        <span>{interview.status}</span>

                                        {interview.status === "SCHEDULED" && (
                                            <div className="interview-actions">
                                                <button
                                                    type="button"
                                                    onClick={() => handleComplete(interview)}
                                                >
                                                    Complete
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleReschedule(interview)}
                                                >
                                                    Reschedule
                                                </button>

                                                <button
                                                    type="button"
                                                    className="cancel-action"
                                                    onClick={() => handleCancel(interview)}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

export default Interviews;
