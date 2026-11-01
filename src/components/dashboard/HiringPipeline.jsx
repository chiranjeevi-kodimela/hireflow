
import './HiringPipeline.css';

const stages = [
    { name: 'Applied', count: 120, color: '#8bbca8' },
    { name: 'Screening', count: 65, color: '#77a9e8' },
    { name: 'Interview', count: 36, color: '#d9b875' },
    { name: 'Offer', count: 18, color: '#bd9bc9' },
    { name: 'Hired', count: 12, color: '#16866b' },
];

function HiringPipeline() {
    return (
        <section className="pipeline-card">
            <div className="section-heading">
                <div>
                    <h3>Hiring pipeline</h3>
                    <p>Candidate progression across stages</p>
                </div>

                <span className="pipeline-period">This month</span>
            </div>

            <div className="pipeline-total">
                <strong>251</strong>
                <span>candidates currently tracked</span>
            </div>

            <div className="pipeline-stages">
                {stages.map((stage) => (
                    <div className="pipeline-stage" key={stage.name}>
                        <div className="stage-info">
                            <span className="stage-dot"
                                style={{ background: stage.color }}
                            />
                            <span>{stage.name}</span>
                            <strong>{stage.count}</strong>
                        </div>

                        <div className="stage-track">
                            <div
                                className="stage-progress"
                                style={{
                                    width: `${(stage.count / 120) * 100}%`,
                                    background: stage.color,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default HiringPipeline;
