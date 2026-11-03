
import { useEffect, useState } from "react";
import {
    getAvailability,
    createAvailability,
} from "../services/availabilityService";
import Pagination from "../components/Pagination";
import "./Availability.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const PAGE_SIZE = 10;

function Availability() {
    const [employees, setEmployees] = useState([]);
    const [interviewerId, setInterviewerId] = useState("");
    const [slots, setSlots] = useState([]);
    const [page, setPage] = useState(1);
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [minimumDateTime] = useState(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    });

    useEffect(() => {
        let ignore = false;

        const fetchEmployees = async () => {
            try {
                const response = await fetch(`${API_URL}/employees`);
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || "Failed to load employees");
                }

                if (!ignore) {
                    setEmployees(result.data || []);
                }
            } catch (err) {
                if (!ignore) setError(err.message);
            }
        };

        fetchEmployees();

        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        if (!interviewerId) return;

        let ignore = false;

        const fetchSlots = async () => {
            setLoading(true);
            setError("");

            try {
                const data = await getAvailability(interviewerId);

                if (!ignore) {
                    setSlots(data || []);
                }
            } catch (err) {
                if (!ignore) setError(err.message);
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        fetchSlots();

        return () => {
            ignore = true;
        };
    }, [interviewerId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!interviewerId) {
            setError("Please select an interviewer.");
            return;
        }

        if (!startTime || !endTime) {
            setError("Please select both start and end times.");
            return;
        }

        if (new Date(startTime) >= new Date(endTime)) {
            setError("End time must be later than start time.");
            return;
        }

        if (new Date(startTime) <= new Date()) {
            setError("Availability must be in the future.");
            return;
        }

        setSaving(true);

        try {
            await createAvailability({
                interviewerId,
                startTime: new Date(startTime).toISOString(),
                endTime: new Date(endTime).toISOString(),
            });

            setStartTime("");
            setEndTime("");

            const updatedSlots = await getAvailability(interviewerId);
            setSlots(updatedSlots || []);
            setSuccess("Availability slot added successfully.");
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (value) =>
        new Date(value).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });

    const formatTime = (value) =>
        new Date(value).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
        });

    const selectedEmployee = employees.find(
        (employee) => employee.employeeId === interviewerId
    );

    return (
        <div className="availability-page">
            <div className="page-header">
                <div>
                    <h1>Availability Management</h1>
                    <p>Manage interviewer schedules and available time slots.</p>
                </div>
            </div>

            <div className="availability-grid">
                <section className="availability-card">
                    <h2>Add Availability</h2>
                    <p className="availability-subtitle">
                        Create a new time slot for an interviewer.
                    </p>

                    <form onSubmit={handleSubmit} className="availability-form">
                        <div className="form-group">
                            <label htmlFor="interviewer">Select Interviewer</label>
                            <select
                                id="interviewer"
                                value={interviewerId}
                                onChange={(e) => {
                                    setInterviewerId(e.target.value);
                                    setSlots([]);
                                    setPage(1);
                                    setError("");
                                    setSuccess("");
                                }}
                                required
                            >
                                <option value="">Choose an employee</option>
                                {employees.map((employee) => (
                                    <option
                                        key={employee.employeeId}
                                        value={employee.employeeId}
                                    >
                                        {employee.name} — {employee.role}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedEmployee && (
                            <div className="selected-employee">
                                <span>Selected employee</span>
                                <strong>{selectedEmployee.name}</strong>
                                <small>{selectedEmployee.role}</small>
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="startTime">Start Date & Time</label>
                            <input
                                id="startTime"
                                type="datetime-local"
                                value={startTime}
                                min={minimumDateTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="endTime">End Date & Time</label>
                            <input
                                id="endTime"
                                type="datetime-local"
                                value={endTime}
                                min={startTime || minimumDateTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <div className="availability-alert error">{error}</div>
                        )}

                        {success && (
                            <div className="availability-alert success">{success}</div>
                        )}

                        <button
                            type="submit"
                            className="availability-submit"
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Add Availability"}
                        </button>
                    </form>
                </section>

                <section className="availability-card">
                    <div className="availability-list-header">
                        <div>
                            <h2>Available Time Slots</h2>
                            <p className="availability-subtitle">
                                {selectedEmployee
                                    ? `Schedule for ${selectedEmployee.name}`
                                    : "Select an interviewer to view their schedule."}
                            </p>
                        </div>

                        <span className="availability-count">
                            {slots.length} slots
                        </span>
                    </div>

                    {!interviewerId ? (
                        <div className="availability-empty">
                            Select an interviewer to view availability.
                        </div>
                    ) : loading ? (
                        <div className="availability-empty">
                            Loading availability...
                        </div>
                    ) : slots.length === 0 ? (
                        <div className="availability-empty">
                            No availability slots found for this interviewer.
                        </div>
                    ) : (
                        <div className="availability-slots">
                            {slots.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((slot) => (
                                <div
                                    className="availability-slot"
                                    key={slot.availabilityId}
                                >
                                    <div className="slot-date">
                                        <strong>{formatDate(slot.startTime)}</strong>
                                        <span>
                                            {formatTime(slot.startTime)} –{" "}
                                            {formatTime(slot.endTime)}
                                        </span>
                                    </div>

                                    <span
                                        className={`slot-status ${slot.status?.toLowerCase()}`}
                                    >
                                        {slot.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    {!loading && slots.length > 0 && (
                        <Pagination
                            page={page}
                            pageCount={Math.max(1, Math.ceil(slots.length / PAGE_SIZE))}
                            pageSize={PAGE_SIZE}
                            totalItems={slots.length}
                            onPageChange={setPage}
                        />
                    )}
                </section>
            </div>
        </div>
    );
}

export default Availability;
