
import { useEffect, useState } from 'react';
import {
    getApplications,
    createApplication,
    updateApplicationStage,
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

    const [selectedApplication, setSelectedApplication] = useState(null);
    const [nextStage, setNextStage] = useState('');
    const [stageReason, setStageReason] = useState('');
    const [updatingStage, setUpdatingStage] = useState(false);

    async function loadData() {
        try {
            setError('');

            const [applicationData, candidateData, requisitionData] =
                await Promise.all([
                    getApplications(),
                    getCandidates(),
                    getRequisitions(),
                ]);

            setApplications(Array.isArray(applicationData) ? applicationData : []);
            setCandidates(Array.isArray(candidateData) ? candidateData : []);
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

                setApplications(Array.isArray(applicationData) ? applicationData : []);
                setCandidates(Array.isArray(candidateData) ? candidateData : []);
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

    async function handleStageUpdate(event) {
        event.preventDefault();

        if (!selectedApplication || !nextStage || !stageReason.trim()) {
            setError('Select a stage and provide a reason.');
            return;
        }

        try {
            setUpdatingStage(true);
            setError('');
            setSuccess('');

            await updateApplicationStage(
                selectedApplication.applicationId,
                {
                    toStage: nextStage,
                    reason: stageReason.trim(),
                }
            );

            setSelectedApplication(null);
            setNextStage('');
            setStageReason('');
            setSuccess('Application stage updated successfully.');

            await loadData();
        } catch (err) {
            setError(err.message);
        } finally {
            setUpdatingStage(false);
        }
    }

    const availableStages = {
        APPLIED: ['SCREENING', 'REJECTED', 'WITHDRAWN'],
        SCREENING: ['TECHNICAL', 'REJECTED', 'WITHDRAWN'],
        TECHNICAL: ['MANAGERIAL', 'REJECTED', 'WITHDRAWN'],
        MANAGERIAL: ['HR', 'REJECTED', 'WITHDRAWN'],
        HR: ['OFFER', 'REJECTED', 'WITHDRAWN'],
        OFFER: ['HIRED', 'REJECTED', 'WITHDRAWN'],
    };

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
            </div>

            {selectedApplication && (
                <div className="application-form-card">
                    <h2>Update Application Stage</h2>

                    <p>
                        {selectedApplication.candidate?.fullName} —{' '}
                        {selectedApplication.requisition?.title}
                    </p>

                    <form onSubmit={handleStageUpdate} className="stage-update-form">
                        <div className="form-group">
                            <label>Current Stage</label>
                            <input
                                value={selectedApplication.currentStage}
                                disabled
                            />
                        </div>

                        <div className="form-group">
                            <label>New Stage</label>
                            <select
                                value={nextStage}
                                onChange={(e) => setNextStage(e.target.value)}
                                required
                            >
                                <option value="">Select next stage</option>
                                {(availableStages[selectedApplication.currentStage] || [])
                                    .map((stage) => (
                                        <option key={stage} value={stage}>
                                            {stage}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Reason for Change</label>
                            <textarea
                                value={stageReason}
                                onChange={(e) => setStageReason(e.target.value)}
                                placeholder="Explain why this stage is changing..."
                                required
                            />
                        </div>

                        <div className="stage-form-actions">
                            <button type="submit" disabled={updatingStage}>
                                {updatingStage ? 'Updating...' : 'Confirm Update'}
                            </button>

                            <button
                                type="button"
                                className="stage-cancel-button"
                                onClick={() => {
                                    setSelectedApplication(null);
                                    setError('');
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {error && <p className="application-error">{error}</p>}
            {success && <p className="application-success">{success}</p>}

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
                                <th>Actions</th>
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

                                    <td>
                                        {application.status === 'ACTIVE' ? (
                                            <button
                                                type="button"
                                                className="stage-action-button"
                                                onClick={() => {
                                                    setSelectedApplication(application);
                                                    setNextStage('');
                                                    setStageReason('');
                                                    setError('');
                                                    setSuccess('');
                                                }}
                                            >
                                                Update Stage
                                            </button>
                                        ) : (
                                            <span>Closed</span>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {applications.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="empty-applications">
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
