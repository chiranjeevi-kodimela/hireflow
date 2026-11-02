
import { useEffect, useState } from 'react';
import {
    getApplications,
    createApplication,
} from '../services/applicationService';
import { getCandidates } from '../services/candidateService';
import { getRequisitions } from '../services/requisitionService';
import './Applications.css';

function Applications() {
    const [applications, setApplications] = useState([]);
    const [candidates, setCandidates] = useState([]);
    const [requisitions, setRequisitions] = useState([]);

    const [candidateId, setCandidateId] = useState('');
    const [requisitionId, setRequisitionId] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    async function loadData() {
        try {
            setError('');

            const [applicationData, candidateData, requisitionData] =
                await Promise.all([
                    getApplications(),
                    getCandidates(),
                    getRequisitions(),
                ]);

            setApplications(
                Array.isArray(applicationData) ? applicationData : []
            );

            setCandidates(
                Array.isArray(candidateData) ? candidateData : []
            );

            setRequisitions(
                (Array.isArray(requisitionData) ? requisitionData : [])
                    .filter((item) => item.status === 'OPEN')
            );
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        let ignore = false;

        async function fetchData() {
            try {
                const [applicationData, candidateData, requisitionData] =
                    await Promise.all([
                        getApplications(),
                        getCandidates(),
                        getRequisitions(),
                    ]);

                if (ignore) return;

                setApplications(
                    Array.isArray(applicationData) ? applicationData : []
                );

                setCandidates(
                    Array.isArray(candidateData) ? candidateData : []
                );

                setRequisitions(
                    (Array.isArray(requisitionData) ? requisitionData : [])
                        .filter((item) => item.status === 'OPEN')
                );
            } catch (err) {
                if (!ignore) setError(err.message);
            } finally {
                if (!ignore) setLoading(false);
            }
        }

        fetchData();

        return () => {
            ignore = true;
        };
    }, []);

    async function handleSubmit(event) {
        event.preventDefault();

        if (!candidateId || !requisitionId) {
            setError('Select both a candidate and a requisition.');
            return;
        }

        try {
            setSaving(true);
            setError('');
            setSuccess('');

            await createApplication({ candidateId, requisitionId });

            setCandidateId('');
            setRequisitionId('');
            setSuccess('Application created successfully.');

            await loadData();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="applications-page">Loading applications...</div>;
    }

    return (
        <div className="applications-page">
            <div className="page-header">
                <div>
                    <h1>Applications</h1>
                    <p>Manage candidate applications and track their progress.</p>
                </div>
            </div>

            <div className="application-form-card">
                <h2>Create Application</h2>

                <form onSubmit={handleSubmit} className="application-form">
                    <div className="form-group">
                        <label>Candidate</label>
                        <select
                            value={candidateId}
                            onChange={(e) => setCandidateId(e.target.value)}
                            required
                        >
                            <option value="">Select candidate</option>
                            {candidates.map((candidate) => (
                                <option
                                    key={candidate.candidateId}
                                    value={candidate.candidateId}
                                >
                                    {candidate.fullName} — {candidate.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Open Requisition</label>
                        <select
                            value={requisitionId}
                            onChange={(e) => setRequisitionId(e.target.value)}
                            required
                        >
                            <option value="">Select requisition</option>
                            {requisitions.map((job) => (
                                <option
                                    key={job.requisitionId}
                                    value={job.requisitionId}
                                >
                                    {job.title} — {job.department}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button type="submit" disabled={saving}>
                        {saving ? 'Creating...' : 'Create Application'}
                    </button>
                </form>

                {error && <p className="application-error">{error}</p>}
                {success && <p className="application-success">{success}</p>}
            </div>

            <div className="application-list-card">
                <div className="application-list-header">
                    <h2>All Applications</h2>
                    <span>{applications.length} applications</span>
                </div>

                <div className="application-table-wrapper">
                    <table className="application-table">
                        <thead>
                            <tr>
                                <th>Candidate</th>
                                <th>Job Title</th>
                                <th>Department</th>
                                <th>Current Stage</th>
                                <th>Status</th>
                                <th>Applied On</th>
                            </tr>
                        </thead>

                        <tbody>
                            {applications.map((application) => (
                                <tr key={application.applicationId}>
                                    <td>
                                        <strong>
                                            {application.candidate?.fullName || 'Unknown'}
                                        </strong>
                                        <small>{application.candidate?.email}</small>
                                    </td>

                                    <td>{application.requisition?.title || 'Unknown'}</td>
                                    <td>{application.requisition?.department || '-'}</td>

                                    <td>
                                        <span className="stage-badge">
                                            {application.currentStage}
                                        </span>
                                    </td>

                                    <td>{application.status}</td>

                                    <td>
                                        {application.appliedAt
                                            ? new Date(application.appliedAt).toLocaleDateString()
                                            : '-'}
                                    </td>
                                </tr>
                            ))}

                            {applications.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="empty-applications">
                                        No applications found.
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

export default Applications;
