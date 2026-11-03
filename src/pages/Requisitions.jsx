import { useEffect, useState } from 'react';
import {
    getRequisitions,
    getHiringManagers,
    createRequisition,
    submitRequisition,
} from '../services/requisitionService';
import Pagination from '../components/Pagination';
import './Requisitions.css';

const PAGE_SIZE = 10;

const initialForm = {
    title: '',
    department: '',
    location: '',
    employmentType: 'FULL_TIME',
    minSalary: '',
    maxSalary: '',
    openings: 1,
    hiringManagerId: '',
};

function Requisitions() {
    const [requisitions, setRequisitions] = useState([]);
    const [page, setPage] = useState(1);
    const [managers, setManagers] = useState([]);
    const [form, setForm] = useState(initialForm);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadData = async () => {
        try {
            setLoading(true);

            const [jobs, hiringManagers] = await Promise.all([
                getRequisitions(),
                getHiringManagers(),
            ]);

            setRequisitions(jobs);
            setManagers(hiringManagers);
            setError('');
        } catch (err) {
            setError(err.message || 'Unable to load requisitions.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let ignore = false;

        const fetchData = async () => {
            try {
                const [jobs, hiringManagers] = await Promise.all([
                    getRequisitions(),
                    getHiringManagers(),
                ]);

                if (!ignore) {
                    setRequisitions(jobs);
                    setManagers(hiringManagers);
                }
            } catch (err) {
                if (!ignore) {
                    setError(err.message || 'Unable to load requisitions.');
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            ignore = true;
        };
    }, []);
    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((previous) => ({ ...previous, [name]: value }));
    };

    const handleCreate = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (Number(form.minSalary) > Number(form.maxSalary)) {
            setError('Minimum salary cannot exceed maximum salary.');
            return;
        }

        if (Number(form.openings) < 1) {
            setError('Openings must be at least 1.');
            return;
        }

        try {
            setSaving(true);

            await createRequisition({
                ...form,
                minSalary: Number(form.minSalary),
                maxSalary: Number(form.maxSalary),
                openings: Number(form.openings),
            });

            setForm(initialForm);
            setShowForm(false);
            setSuccess('Requisition saved as a draft.');
            await loadData();
        } catch (err) {
            setError(err.message || 'Could not create requisition.');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitForApproval = async (requisition) => {
        const manager = managers.find(
            (item) => item.hiringManagerId === requisition.hiringManagerId
        );

        if (!manager) {
            setError('Hiring manager details could not be found.');
            return;
        }

        setError('');
        setSuccess('');

        try {
            await submitRequisition(
                requisition.requisitionId,
                manager.employeeId
            );

            setSuccess('Requisition submitted for approval.');
            await loadData();
        } catch (err) {
            setError(err.message || 'Could not submit requisition.');
        }
    };

    const statusClass = (status) => {
        return `status-badge status-${status?.toLowerCase()}`;
    };
    const pageCount = Math.max(1, Math.ceil(requisitions.length / PAGE_SIZE));
    const visibleRequisitions = requisitions.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE
    );

    return (
        <div className="requisitions-page">
            <div className="requisitions-header">
                <div>
                    <p className="page-eyebrow">WORKSPACE / JOBS</p>
                    <h1>Requisitions</h1>
                    <p className="page-description">
                        Create and manage hiring requests across your organization.
                    </p>
                </div>

                <button
                    className="primary-button"
                    onClick={() => {
                        setShowForm(!showForm);
                        setError('');
                        setSuccess('');
                    }}
                >
                    {showForm ? 'Cancel' : '+ Create requisition'}
                </button>
            </div>

            {error && <div className="notice error-notice">{error}</div>}
            {success && <div className="notice success-notice">{success}</div>}

            {showForm && (
                <section className="requisition-form-card">
                    <div className="form-heading">
                        <div>
                            <h2>New requisition</h2>
                            <p>Enter the details of the hiring request.</p>
                        </div>
                    </div>

                    <form onSubmit={handleCreate}>
                        <div className="form-grid">
                            <label>
                                Job title *
                                <input
                                    name="title"
                                    value={form.title}
                                    onChange={handleChange}
                                    placeholder="e.g. Software Engineer"
                                    required
                                />
                            </label>

                            <label>
                                Department *
                                <input
                                    name="department"
                                    value={form.department}
                                    onChange={handleChange}
                                    placeholder="e.g. Engineering"
                                    required
                                />
                            </label>

                            <label>
                                Location *
                                <input
                                    name="location"
                                    value={form.location}
                                    onChange={handleChange}
                                    placeholder="e.g. Hyderabad"
                                    required
                                />
                            </label>

                            <label>
                                Employment type *
                                <select
                                    name="employmentType"
                                    value={form.employmentType}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="FULL_TIME">Full-time</option>
                                    <option value="PART_TIME">Part-time</option>
                                    <option value="CONTRACT">Contract</option>
                                    <option value="INTERN">Internship</option>
                                </select>
                            </label>

                            <label>
                                Minimum salary (annual) *
                                <input
                                    type="number"
                                    name="minSalary"
                                    min="0"
                                    value={form.minSalary}
                                    onChange={handleChange}
                                    placeholder="e.g. 500000"
                                    required
                                />
                            </label>

                            <label>
                                Maximum salary (annual) *
                                <input
                                    type="number"
                                    name="maxSalary"
                                    min="0"
                                    value={form.maxSalary}
                                    onChange={handleChange}
                                    placeholder="e.g. 900000"
                                    required
                                />
                            </label>

                            <label>
                                Number of openings *
                                <input
                                    type="number"
                                    name="openings"
                                    min="1"
                                    step="1"
                                    value={form.openings}
                                    onChange={handleChange}
                                    required
                                />
                            </label>

                            <label>
                                Hiring manager *
                                <select
                                    name="hiringManagerId"
                                    value={form.hiringManagerId}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select a manager</option>
                                    {managers.map((manager) => (
                                        <option
                                            key={manager.hiringManagerId}
                                            value={manager.hiringManagerId}
                                        >
                                            {manager.employee.fullName} — {manager.designation}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => setShowForm(false)}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="primary-button"
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : 'Save as draft'}
                            </button>
                        </div>
                    </form>
                </section>
            )}

            <section className="requisition-list-card">
                <div className="list-heading">
                    <div>
                        <h2>All requisitions</h2>
                        <p>Track the status of your hiring requests.</p>
                    </div>
                    <span className="record-count">
                        {requisitions.length} records
                    </span>
                </div>

                {loading ? (
                    <p className="empty-state">Loading requisitions...</p>
                ) : requisitions.length === 0 ? (
                    <p className="empty-state">
                        No requisitions found. Create your first hiring request.
                    </p>
                ) : (
                    <div className="table-wrapper">
                        <table className="requisition-table">
                            <thead>
                                <tr>
                                    <th>JOB TITLE</th>
                                    <th>DEPARTMENT</th>
                                    <th>LOCATION</th>
                                    <th>OPENINGS</th>
                                    <th>STATUS</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleRequisitions.map((item) => (
                                    <tr key={item.requisitionId}>
                                        <td>
                                            <strong>{item.title}</strong>
                                            <small>{item.requisitionId}</small>
                                        </td>
                                        <td>{item.department}</td>
                                        <td>{item.location}</td>
                                        <td>{item.openings}</td>
                                        <td>
                                            <span className={statusClass(item.status)}>
                                                {item.status?.replaceAll('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            {item.status === 'DRAFT' && (
                                                <button
                                                    className="text-button"
                                                    onClick={() => handleSubmitForApproval(item)}
                                                >
                                                    Submit for approval
                                                </button>
                                            )}

                                            {item.status === 'PENDING_APPROVAL' && (
                                                <span className="muted-action">Awaiting approval</span>
                                            )}

                                            {item.status === 'OPEN' && (
                                                <span className="muted-action">Hiring active</span>
                                            )}

                                            {['CLOSED', 'CANCELLED', 'ON_HOLD'].includes(item.status) && (
                                                <span className="muted-action">No action available</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {!loading && (
                    <Pagination
                        page={page}
                        pageCount={pageCount}
                        pageSize={PAGE_SIZE}
                        totalItems={requisitions.length}
                        onPageChange={setPage}
                    />
                )}
            </section>
        </div>
    );
}

export default Requisitions;