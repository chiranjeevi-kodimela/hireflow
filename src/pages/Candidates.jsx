
import { useEffect, useState } from 'react';
import {
    getCandidates,
    createCandidate,
} from '../services/candidateService';
import './Candidates.css';

const initialForm = {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    experienceYears: '',
    currentCompany: '',
    resumeUrl: '',
};

function Candidates() {
    const [candidates, setCandidates] = useState([]);
    const [form, setForm] = useState(initialForm);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadCandidates = async () => {
        try {
            const data = await getCandidates();
            setCandidates(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let ignore = false;

        const fetchCandidates = async () => {
            try {
                const data = await getCandidates();
                if (!ignore) setCandidates(data);
            } catch (err) {
                if (!ignore) setError(err.message);
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        fetchCandidates();

        return () => {
            ignore = true;
        };
    }, []);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleCreate = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        try {
            setSaving(true);

            await createCandidate({
                ...form,
                experienceYears: Number(form.experienceYears),
            });

            setForm(initialForm);
            setShowForm(false);
            setSuccess('Candidate added successfully.');

            await loadCandidates();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const filteredCandidates = candidates.filter((candidate) => {
        const query = search.toLowerCase();

        return (
            candidate.fullName.toLowerCase().includes(query) ||
            candidate.email.toLowerCase().includes(query) ||
            (candidate.currentCompany || '').toLowerCase().includes(query)
        );
    });

    return (
        <div className="candidates-page">
            <div className="candidates-header">
                <div>
                    <p className="page-eyebrow">WORKSPACE / CANDIDATES</p>
                    <h1>Candidates</h1>
                    <p className="page-description">
                        Manage your talent pool and candidate information.
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
                    {showForm ? 'Cancel' : '+ Add candidate'}
                </button>
            </div>

            {error && <div className="notice error-notice">{error}</div>}
            {success && <div className="notice success-notice">{success}</div>}

            {showForm && (
                <section className="candidate-form-card">
                    <h2>Add new candidate</h2>
                    <p>Enter the candidate's contact and professional details.</p>

                    <form onSubmit={handleCreate}>
                        <div className="form-grid">
                            <label>
                                Full name *
                                <input
                                    name="fullName"
                                    value={form.fullName}
                                    onChange={handleChange}
                                    required
                                />
                            </label>

                            <label>
                                Email address *
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                />
                            </label>

                            <label>
                                Phone
                                <input
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                />
                            </label>

                            <label>
                                Location
                                <input
                                    name="location"
                                    value={form.location}
                                    onChange={handleChange}
                                />
                            </label>

                            <label>
                                Experience (years) *
                                <input
                                    type="number"
                                    name="experienceYears"
                                    min="0"
                                    max="99.9"
                                    step="0.1"
                                    value={form.experienceYears}
                                    onChange={handleChange}
                                    required
                                />
                            </label>

                            <label>
                                Current company
                                <input
                                    name="currentCompany"
                                    value={form.currentCompany}
                                    onChange={handleChange}
                                />
                            </label>

                            <label className="full-width">
                                Resume URL
                                <input
                                    type="url"
                                    name="resumeUrl"
                                    value={form.resumeUrl}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                />
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
                                {saving ? 'Adding...' : 'Add candidate'}
                            </button>
                        </div>
                    </form>
                </section>
            )}

            <section className="candidate-list-card">
                <div className="candidate-list-heading">
                    <div>
                        <h2>All candidates</h2>
                        <p>{candidates.length} candidates in your talent pool</p>
                    </div>

                    <input
                        className="candidate-search"
                        placeholder="Search candidates..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>

                {loading ? (
                    <p className="empty-state">Loading candidates...</p>
                ) : filteredCandidates.length === 0 ? (
                    <p className="empty-state">No matching candidates found.</p>
                ) : (
                    <div className="table-wrapper">
                        <table className="candidate-table">
                            <thead>
                                <tr>
                                    <th>CANDIDATE</th>
                                    <th>LOCATION</th>
                                    <th>EXPERIENCE</th>
                                    <th>CURRENT COMPANY</th>
                                    <th>CONTACT</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredCandidates.map((candidate) => (
                                    <tr key={candidate.candidateId}>
                                        <td>
                                            <strong>{candidate.fullName}</strong>
                                            <small>{candidate.candidateId}</small>
                                        </td>
                                        <td>{candidate.location || '—'}</td>
                                        <td>{candidate.experienceYears} years</td>
                                        <td>{candidate.currentCompany || '—'}</td>
                                        <td>{candidate.email}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

export default Candidates;
