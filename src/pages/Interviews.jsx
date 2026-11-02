
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    getInterviews,
    createInterview,
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
    return interview.participants?.find(
        (participant) => participant.role === "LEAD"
    )?.employeeId;
}

function getCandidateName(interview) {
    const candidate = interview.application?.candidate;

    return (
        candidate?.fullName ||
        candidate?.name ||
        [candidate?.firstName, candidate?.lastName].filter(Boolean).join(" ") ||
        "Unknown candidate"
    );
}

function getEmployeeName(employee) {
    return employee?.fullName || employee?.name || "Unknown employee";
}

function Interviews() {
    const [interviews, setInterviews] = useState([]);
    const [applications, setApplications] = useState([]);
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
        panelistIds: [],
        observerIds: [],
    });

    const selectedApplication = applications.find(
        (application) => application.applicationId === form.applicationId
    );

    const selectedPanel = panels.find(
        (panel) => panel.panelId === form.panelId
    );

    const panelMembers = useMemo(() => {
        return (selectedPanel?.members || [])
            .filter((member) => member.employee?.isActive)
            .map((member) => member.employee);
    }, [selectedPanel]);

    const loadInterviews = useCallback(async (currentFilters = {}) => {
        try {
            const data = await getInterviews(currentFilters);
            setInterviews(Array.isArray(data) ? data : []);
            setError("");
        } catch (err) {
            setError(err.message || "Failed to load interviews");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadInitialData() {
            try {
                const [interviewData, applicationData] = await Promise.all([
                    getInterviews(),
                    getApplications(),
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
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load scheduling data");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadInitialData();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const requisitionId = selectedApplication?.requisitionId;

        if (!requisitionId) return;

        let cancelled = false;

        async function loadPanels() {
            try {
                const data = await getInterviewPanels(requisitionId);

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

    const resetParticipants = () => ({
        leadInterviewer: "",
        panelistIds: [],
        observerIds: [],
    });

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => {
            if (name === "applicationId") {
                return {
                    ...previous,
                    applicationId: value,
                    panelId: "",
                    ...resetParticipants(),
                };
            }

            if (name === "panelId") {
                return {
                    ...previous,
                    panelId: value,
                    ...resetParticipants(),
                };
            }

            if (name === "leadInterviewer") {
                return {
                    ...previous,
                    leadInterviewer: value,
                    panelistIds: previous.panelistIds.filter((id) => id !== value),
                    observerIds: previous.observerIds.filter((id) => id !== value),
                };
            }

            return { ...previous, [name]: value };
        });

        if (name === "applicationId") {
            setPanels([]);
        }
    };

    const handleMultiSelect = (event) => {
        const { name, selectedOptions } = event.target;

        const values = Array.from(selectedOptions, (option) => option.value);

        setForm((previous) => ({
            ...previous,
            [name]: values.filter(
                (id) => id !== previous.leadInterviewer &&
                    !(name === "panelistIds" && previous.observerIds.includes(id)) &&
                    !(name === "observerIds" && previous.panelistIds.includes(id))
            ),
        }));
    };

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

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime()) ||
            start <= new Date()
        ) {
            setError("Interview must be scheduled for a valid future time.");
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
            ...form.panelistIds.map((employeeId) => ({
                employeeId,
                role: "PANELIST",
            })),
            ...form.observerIds.map((employeeId) => ({
                employeeId,
                role: "OBSERVER",
            })),
        ];

        if (
            new Set(participants.map((participant) => participant.employeeId)).size !==
            participants.length
        ) {
            setError("An employee cannot have multiple roles in the same interview.");
            return;
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
                panelistIds: [],
                observerIds: [],
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

    const renderActions = (interview) => {
        if (interview.status !== "SCHEDULED") return null;

        return (
            <div className="interview-actions">
                <button type="button" onClick={() => handleComplete(interview)}>
                    Complete
                </button>

                <button type="button" onClick={() => handleReschedule(interview)}>
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
        );
    };

    const renderInterview = (interview) => (
        <tr key={interview.interviewId}>
            <td>{getCandidateName(interview)}</td>
            <td>{interview.application?.requisition?.title || "—"}</td>
            <td>{interview.interviewType}</td>
            <td>{interview.panel?.panelName || "—"}</td>
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
            <td>{renderActions(interview)}</td>
        </tr>
    );

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
                                    {application.candidate?.fullName || "Candidate"}
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
                                    {panel.panelName}
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
                            disabled={!selectedPanel}
                        >
                            <option value="">Select lead interviewer</option>

                            {panelMembers.map((employee) => (
                                <option key={employee.employeeId} value={employee.employeeId}>
                                    {getEmployeeName(employee)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Additional Panelists
                        <select
                            name="panelistIds"
                            value={form.panelistIds}
                            onChange={handleMultiSelect}
                            multiple
                            disabled={!selectedPanel}
                        >
                            {panelMembers
                                .filter(
                                    (employee) =>
                                        employee.employeeId !== form.leadInterviewer &&
                                        !form.observerIds.includes(employee.employeeId)
                                )
                                .map((employee) => (
                                    <option key={employee.employeeId} value={employee.employeeId}>
                                        {getEmployeeName(employee)}
                                    </option>
                                ))}
                        </select>
                        <small>Use Ctrl or Cmd to select multiple panelists.</small>
                    </label>

                    <label>
                        Observers (Optional)
                        <select
                            name="observerIds"
                            value={form.observerIds}
                            onChange={handleMultiSelect}
                            multiple
                            disabled={!selectedPanel}
                        >
                            {panelMembers
                                .filter(
                                    (employee) =>
                                        employee.employeeId !== form.leadInterviewer &&
                                        !form.panelistIds.includes(employee.employeeId)
                                )
                                .map((employee) => (
                                    <option key={employee.employeeId} value={employee.employeeId}>
                                        {getEmployeeName(employee)}
                                    </option>
                                ))}
                        </select>
                        <small>Observers do not require availability.</small>
                    </label>

                    <label>
                        Start Time
                        <input
                            type="datetime-local"
                            name="startTime"
                            value={form.startTime}
                            onChange={handleChange}
                            min={toLocalInput(new Date())}
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
                            min={form.startTime || toLocalInput(new Date())}
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
                                        {renderActions(interview)}
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
