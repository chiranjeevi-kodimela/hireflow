
import { useEffect, useState } from "react";
import {
    getCompletedInterviews,
    getEvaluationCriteria,
    createScorecard,
} from "../services/scorecardService";
import "./Evaluations.css";

function Evaluations() {
    const [interviews, setInterviews] = useState([]);
    const [selectedInterviewId, setSelectedInterviewId] = useState("");
    const [criteria, setCriteria] = useState([]);
    const [reviewerId, setReviewerId] = useState("");
    const [technicalScore, setTechnicalScore] = useState(5);
    const [communicationScore, setCommunicationScore] = useState(5);
    const [problemSolvingScore, setProblemSolvingScore] = useState(5);
    const [items, setItems] = useState({});
    const [comments, setComments] = useState("");
    const [loading, setLoading] = useState(true);
    const [criteriaLoading, setCriteriaLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [submittedScorecard, setSubmittedScorecard] = useState(null);

    useEffect(() => {
        let ignore = false;

        const loadInterviews = async () => {
            try {
                const data = await getCompletedInterviews();
                if (!ignore) setInterviews(data);
            } catch (err) {
                if (!ignore) setError(err.message);
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        loadInterviews();

        return () => {
            ignore = true;
        };
    }, []);

    const selectedInterview = interviews.find(
        (interview) => interview.interviewId === selectedInterviewId
    );

    useEffect(() => {
        if (!selectedInterview) return;

        let ignore = false;

        const loadCriteria = async () => {
            setCriteriaLoading(true);
            setError("");
            setCriteria([]);
            setItems({});
            setReviewerId("");

            try {
                const requisitionId =
                    selectedInterview.application?.requisitionId;

                if (!requisitionId) {
                    throw new Error("Requisition information is missing for this interview.");
                }

                const data = await getEvaluationCriteria(requisitionId);

                if (!ignore) {
                    setCriteria(data || []);
                }
            } catch (err) {
                if (!ignore) setError(err.message);
            } finally {
                if (!ignore) setCriteriaLoading(false);
            }
        };

        loadCriteria();

        return () => {
            ignore = true;
        };
    }, [selectedInterview]);

    const participants = (selectedInterview?.participants || []).filter(
        (participant) => participant.role !== "OBSERVER"
    );

    const handleScoreChange = (criterionId, score) => {
        setItems((previous) => ({
            ...previous,
            [criterionId]: {
                score: Number(score),
                comments: previous[criterionId]?.comments || "",
            },
        }));
    };

    const handleItemCommentChange = (criterionId, value) => {
        setItems((previous) => ({
            ...previous,
            [criterionId]: {
                score: previous[criterionId]?.score ?? 5,
                comments: value,
            },
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSuccess("");
        setSubmittedScorecard(null);

        if (!selectedInterviewId || !reviewerId) {
            setError("Select an interview and reviewer.");
            return;
        }

        const missingCriteria = criteria.filter(
            (criterion) =>
                criterion.isRequired &&
                items[criterion.criterionId]?.score === undefined
        );

        if (missingCriteria.length > 0) {
            setError(
                `Complete required criteria: ${missingCriteria
                    .map((criterion) => criterion.name)
                    .join(", ")}`
            );
            return;
        }

        const evaluationItems = criteria
            .filter((criterion) => items[criterion.criterionId])
            .map((criterion) => ({
                criterionId: criterion.criterionId,
                score: items[criterion.criterionId].score,
                comments: items[criterion.criterionId].comments,
            }));

        if (evaluationItems.length === 0) {
            setError("Enter at least one evaluation score.");
            return;
        }

        setSaving(true);

        try {
            const result = await createScorecard({
                interviewId: selectedInterviewId,
                reviewerId,
                technicalScore: Number(technicalScore),
                communicationScore: Number(communicationScore),
                problemSolvingScore: Number(problemSolvingScore),
                comments,
                items: evaluationItems,
            });

            setSubmittedScorecard(result);
            setSuccess("Evaluation submitted successfully.");
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const getCandidateName = (interview) =>
        interview?.application?.candidate?.name || "Candidate";

    const getParticipantName = (participant) =>
        participant.employee?.name || participant.employeeId;

    return (
        <div className="evaluations-page">
            <div className="page-header">
                <div>
                    <h1>Candidate Evaluations</h1>
                    <p>Review completed interviews using structured scorecards.</p>
                </div>
            </div>

            {error && <div className="evaluation-alert error">{error}</div>}
            {success && <div className="evaluation-alert success">{success}</div>}

            <section className="evaluation-card">
                <h2>Select Interview</h2>
                <p className="evaluation-subtitle">
                    Only completed interviews can be evaluated.
                </p>

                {loading ? (
                    <p>Loading completed interviews...</p>
                ) : interviews.length === 0 ? (
                    <p className="evaluation-empty">
                        No completed interviews available for evaluation.
                    </p>
                ) : (
                    <div className="evaluation-form-group">
                        <label htmlFor="interview">Completed Interview</label>
                        <select
                            id="interview"
                            value={selectedInterviewId}
                            onChange={(event) => {
                                setSelectedInterviewId(event.target.value);
                                setSuccess("");
                                setSubmittedScorecard(null);
                            }}
                        >
                            <option value="">Choose an interview</option>
                            {interviews.map((interview) => (
                                <option
                                    key={interview.interviewId}
                                    value={interview.interviewId}
                                >
                                    {getCandidateName(interview)} — {interview.interviewType}
                                    {" — "}
                                    {interview.interviewId}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </section>

            {selectedInterview && (
                <section className="evaluation-card">
                    <h2>Interview Details</h2>

                    <div className="evaluation-details">
                        <div>
                            <span>Candidate</span>
                            <strong>{getCandidateName(selectedInterview)}</strong>
                        </div>
                        <div>
                            <span>Interview type</span>
                            <strong>{selectedInterview.interviewType}</strong>
                        </div>
                        <div>
                            <span>Interview ID</span>
                            <strong>{selectedInterview.interviewId}</strong>
                        </div>
                    </div>
                </section>
            )}

            {selectedInterview && (
                <section className="evaluation-card">
                    <h2>Structured Scorecard</h2>
                    <p className="evaluation-subtitle">
                        Rate each category from 0 to 10 and provide rubric feedback.
                    </p>

                    {criteriaLoading ? (
                        <p>Loading evaluation criteria...</p>
                    ) : criteria.length === 0 ? (
                        <p className="evaluation-empty">
                            No active evaluation criteria found for this requisition.
                        </p>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="evaluation-form-group">
                                <label htmlFor="reviewer">Reviewer</label>
                                <select
                                    id="reviewer"
                                    value={reviewerId}
                                    onChange={(event) => setReviewerId(event.target.value)}
                                    required
                                >
                                    <option value="">Select assigned interviewer</option>
                                    {participants.map((participant) => (
                                        <option
                                            key={participant.employeeId}
                                            value={participant.employeeId}
                                        >
                                            {getParticipantName(participant)}
                                            {" — "}
                                            {participant.role}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <h3 className="evaluation-section-title">
                                Overall Categories
                            </h3>

                            <div className="category-score-grid">
                                <div className="evaluation-form-group">
                                    <label htmlFor="technicalScore">
                                        Technical Score: {technicalScore}/10
                                    </label>
                                    <input
                                        id="technicalScore"
                                        type="range"
                                        min="0"
                                        max="10"
                                        step="1"
                                        value={technicalScore}
                                        onChange={(event) =>
                                            setTechnicalScore(event.target.value)
                                        }
                                    />
                                </div>

                                <div className="evaluation-form-group">
                                    <label htmlFor="communicationScore">
                                        Communication: {communicationScore}/10
                                    </label>
                                    <input
                                        id="communicationScore"
                                        type="range"
                                        min="0"
                                        max="10"
                                        step="1"
                                        value={communicationScore}
                                        onChange={(event) =>
                                            setCommunicationScore(event.target.value)
                                        }
                                    />
                                </div>

                                <div className="evaluation-form-group">
                                    <label htmlFor="problemSolvingScore">
                                        Problem Solving: {problemSolvingScore}/10
                                    </label>
                                    <input
                                        id="problemSolvingScore"
                                        type="range"
                                        min="0"
                                        max="10"
                                        step="1"
                                        value={problemSolvingScore}
                                        onChange={(event) =>
                                            setProblemSolvingScore(event.target.value)
                                        }
                                    />
                                </div>
                            </div>

                            <h3 className="evaluation-section-title">
                                Evaluation Criteria
                            </h3>

                            <div className="criteria-list">
                                {criteria.map((criterion) => (
                                    <div
                                        className="criterion-item"
                                        key={criterion.criterionId}
                                    >
                                        <div className="criterion-header">
                                            <div>
                                                <strong>{criterion.name}</strong>
                                                <p>
                                                    {criterion.description ||
                                                        "Evaluate the candidate against this criterion."}
                                                </p>
                                            </div>

                                            <span className="criterion-weight">
                                                Weight: {Number(criterion.weight)}
                                            </span>
                                        </div>

                                        <div className="criterion-controls">
                                            <label>
                                                Score:{" "}
                                                {items[criterion.criterionId]?.score ?? "Not rated"}
                                                /10
                                            </label>

                                            <input
                                                type="range"
                                                min="0"
                                                max="10"
                                                step="1"
                                                value={
                                                    items[criterion.criterionId]?.score ?? 5
                                                }
                                                onChange={(event) =>
                                                    handleScoreChange(
                                                        criterion.criterionId,
                                                        event.target.value
                                                    )
                                                }
                                            />

                                            <input
                                                type="text"
                                                placeholder="Optional criterion feedback"
                                                value={
                                                    items[criterion.criterionId]?.comments || ""
                                                }
                                                onChange={(event) =>
                                                    handleItemCommentChange(
                                                        criterion.criterionId,
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </div>

                                        {criterion.isRequired && (
                                            <span className="required-label">
                                                Required
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="evaluation-form-group overall-comments">
                                <label htmlFor="comments">Overall Feedback</label>
                                <textarea
                                    id="comments"
                                    rows="4"
                                    value={comments}
                                    onChange={(event) => setComments(event.target.value)}
                                    placeholder="Add your overall interview feedback..."
                                />
                            </div>

                            <button
                                type="submit"
                                className="evaluation-submit"
                                disabled={saving || criteriaLoading}
                            >
                                {saving ? "Submitting..." : "Submit Evaluation"}
                            </button>
                        </form>
                    )}
                </section>
            )}

            {submittedScorecard && (
                <section className="evaluation-card submitted-result">
                    <h2>Evaluation Submitted</h2>

                    <div className="evaluation-details">
                        <div>
                            <span>Weighted Score</span>
                            <strong>
                                {submittedScorecard.weightedScore?.toFixed(2) ?? "—"}/10
                            </strong>
                        </div>
                        <div>
                            <span>Recommendation</span>
                            <strong>
                                {submittedScorecard.recommendation?.replaceAll("_", " ")}
                            </strong>
                        </div>
                        <div>
                            <span>Scorecard ID</span>
                            <strong>{submittedScorecard.scorecardId}</strong>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}

export default Evaluations;
