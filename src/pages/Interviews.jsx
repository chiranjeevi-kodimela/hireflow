import { useEffect, useState } from "react";
import {
    getInterviews,
    createInterview,
    getEmployees,
    getInterviewPanels,
} from "../services/interviewService";
import { getApplications } from "../services/applicationService";
import "./Interviews.css";

function Interviews() {
    const [interviews, setInterviews] = useState([]);
    const [applications, setApplications] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [panels, setPanels] = useState([]);

    const [statusFilter, setStatusFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");

    const [applicationId, setApplicationId] = useState("");
    const [panelId, setPanelId] = useState("");
    const [interviewType, setInterviewType] = useState("SCREENING");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [leadInterviewer, setLeadInterviewer] = useState("");
    const [panelist, setPanelist] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function loadInterviews() {
        const data = await getInterviews({
            status: statusFilter,
            interviewType: typeFilter,
        });

        setInterviews(Array.isArray(data) ? data : []);
    }

    useEffect(() => {
        async function loadData() {
            try {
                setError("");

                const [interviewData, applicationData, employeeData, panelData] =
                    await Promise.all([
                        getInterviews(),
                        getApplications(),
                        getEmployees(),
                        getInterviewPanels(),
                    ]);

                setInterviews(interviewData || []);
                setApplications(
                    (applicationData || []).filter(
                        (item) =>
                            item.status === "ACTIVE" &&
                            ["SCREENING", "TECHNICAL", "MANAGERIAL", "HR"].includes(
                                item.currentStage
                            )
                    )
                );
                setEmployees(employeeData || []);
                setPanels(panelData || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);


    useEffect(() => {
        let ignore = false;

        async function fetchFilteredInterviews() {
            try {
                const data = await getInterviews({
                    status: statusFilter,
                    interviewType: typeFilter,
                });

                if (!ignore) {
                    setInterviews(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                if (!ignore) {
                    setError(err.message);
                }
            }
        }

        fetchFilteredInterviews();

        return () => {
            ignore = true;
        };
    }, [statusFilter, typeFilter]);

    useEffect(() => {
        let ignore = false;

        async function fetchPanels() {
            if (!applicationId) {
                setPanels([]);
                return;
            }

            const application = applications.find(
                (item) => item.applicationId === applicationId
            );

            if (!application?.requisitionId) return;

            try {
                const data = await getInterviewPanels(application.requisitionId);

                if (!ignore) {
                    setPanels(data || []);
                }
            } catch (err) {
                if (!ignore) {
                    setError(err.message);
                }
            }
        }

        fetchPanels();

        return () => {
            ignore = true;
        };
    }, [applicationId, applications]);

    async function handleSchedule(event) {
        event.preventDefault();

        if (
            !applicationId ||
            !panelId ||
            !startTime ||
            !endTime ||
            !leadInterviewer
        ) {
            setError("Please complete all required scheduling fields.");
            return;
        }

        const participants = [
            {
                employeeId: leadInterviewer,
                role: "LEAD",
            },
        ];

        if (panelist && panelist !== leadInterviewer) {
            participants.push({
                employeeId: panelist,
                role: "PANELIST",
            });
        }

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            await createInterview({
                applicationId,
                panelId,
                interviewType,
                startTime: new Date(startTime).toISOString(),
                endTime: new Date(endTime).toISOString(),
                participants,
            });

            setApplicationId("");
            setPanelId("");
            setStartTime("");
            setEndTime("");
            setLeadInterviewer("");
            setPanelist("");

            setSuccess("Interview scheduled successfully.");

            await loadInterviews();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="interviews-page">Loading interviews...</div>;
    }

    return (
        <div className="interviews-page">
            <div className="page-header">
                <div>
                    <h1>Interviews</h1>
                    <p>Schedule interviews and manage interviewer assignments.</p>
                </div>
            </div>

            <div className="interview-form-card">
                <h2>Schedule Interview</h2>

                <form onSubmit={handleSchedule} className="interview-form">
                    <div className="form-group">
                        <label>Application</label>
                        <select
                            value={applicationId}
                            onChange={(e) => setApplicationId(e.target.value)}
                            required
                        >
                            <option value="">Select application</option>
                            {applications.map((application) => (
                                <option
                                    key={application.applicationId}
                                    value={application.applicationId}
                                >
                                    {application.candidate?.fullName} —{" "}
                                    {application.requisition?.title} (
                                    {application.currentStage})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Interview Type</label>
                        <select
                            value={interviewType}
                            onChange={(e) => setInterviewType(e.target.value)}
                        >
                            <option value="SCREENING">Screening</option>
                            <option value="TECHNICAL">Technical</option>
                            <option value="MANAGERIAL">Managerial</option>
                            <option value="HR">HR</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Interview Panel</label>
                        <select
                            value={panelId}
                            onChange={(e) => setPanelId(e.target.value)}
                            required
                        >
                            <option value="">Select panel</option>
                            {panels.map((panel) => (
                                <option key={panel.panelId} value={panel.panelId}>
                                    {panel.panelName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Lead Interviewer</label>
                        <select
                            value={leadInterviewer}
                            onChange={(e) => setLeadInterviewer(e.target.value)}
                            required
                        >
                            <option value="">Select lead interviewer</option>
                            {employees.map((employee) => (
                                <option
                                    key={employee.employeeId}
                                    value={employee.employeeId}
                                >
                                    {employee.fullName} ({employee.role})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Additional Panelist (Optional)</label>
                        <select
                            value={panelist}
                            onChange={(e) => setPanelist(e.target.value)}
                        >
                            <option value="">No additional panelist</option>
                            {employees
                                .filter(
                                    (employee) =>
                                        employee.employeeId !== leadInterviewer
                                )
                                .map((employee) => (
                                    <option
                                        key={employee.employeeId}
                                        value={employee.employeeId}
                                    >
                                        {employee.fullName}
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Start Time</label>
                        <input
                            type="datetime-local"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>End Time</label>
                        <input
                            type="datetime-local"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" disabled={saving}>
                        {saving ? "Scheduling..." : "Schedule Interview"}
                    </button>
                </form>
            </div>

            {error && <p className="interview-error">{error}</p>}
            {success && <p className="interview-success">{success}</p>}

            <div className="interview-list-card">
                <div className="interview-list-header">
                    <h2>All Interviews</h2>
                    <span>{interviews.length} interviews</span>
                </div>

                <div className="interview-filters">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">All statuses</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                    >
                        <option value="">All interview types</option>
                        <option value="SCREENING">Screening</option>
                        <option value="TECHNICAL">Technical</option>
                        <option value="MANAGERIAL">Managerial</option>
                        <option value="HR">HR</option>
                    </select>
                </div>

                <div className="interview-table-wrapper">
                    <table className="interview-table">
                        <thead>
                            <tr>
                                <th>Candidate</th>
                                <th>Position</th>
                                <th>Interview Type</th>
                                <th>Panel</th>
                                <th>Scheduled Time</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {interviews.map((interview) => (
                                <tr key={interview.interviewId}>
                                    <td>
                                        <strong>
                                            {interview.application?.candidate?.fullName || "Unknown"}
                                        </strong>
                                    </td>
                                    <td>
                                        {interview.application?.requisition?.title || "-"}
                                    </td>
                                    <td>{interview.interviewType}</td>
                                    <td>{interview.panel?.panelName || "-"}</td>
                                    <td>
                                        {new Date(interview.startTime).toLocaleString()}
                                        {" — "}
                                        {new Date(interview.endTime).toLocaleTimeString()}
                                    </td>
                                    <td>
                                        <span className="interview-status">
                                            {interview.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}

                            {interviews.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="empty-interviews">
                                        No interviews found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Interviews;