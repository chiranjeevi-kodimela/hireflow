import './HiringPipeline.css';

const stages = [
    { key: 'applied', name: 'Applied', color: '#8bbca8' },
    { key: 'screening', name: 'Screening', color: '#77a9e8' },
    { key: 'interview', name: 'Interview', color: '#d9b875' },
    { key: 'offer', name: 'Offer', color: '#bd9bc9' },
    { key: 'hired', name: 'Hired', color: '#16866b' },
];

function HiringPipeline({ pipeline }) {
    const counts = pipeline?.stages || {};

    const maxCount = Math.max(
        ...stages.map((stage) => counts[stage.key] || 0),
        1
    );

    return (
        <section className="pipeline-card">
            <div className="section-heading">
                <div>
                    <h3>Hiring pipeline</h3>
                    <p>Candidate progression across stages</p>
                </div>

                <span className="pipeline-period">All time</span>
            </div>

            <div className="pipeline-total">
                <strong>
                    {(pipeline?.totalApplications || 0).toLocaleString()}
                </strong>
                <span>applications across active stages</span>
            </div>

            <div className="pipeline-stages">
                {stages.map((stage) => {
                    const count = counts[stage.key] || 0;

                    return (
                        <div className="pipeline-stage" key={stage.key}>
                            <div className="stage-info">
                                <span
                                    className="stage-dot"
                                    style={{ background: stage.color }}
                                />

                                <span>{stage.name}</span>
                                <strong>{count.toLocaleString()}</strong>
                            </div>

                            <div className="stage-track">
                                <div
                                    className="stage-progress"
                                    style={{
                                        width: `${(count / maxCount) * 100}%`,
                                        background: stage.color,
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

export default HiringPipeline;