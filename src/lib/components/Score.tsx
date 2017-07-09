import React from 'react';

interface ScoreProps {
    score: number;
}

class Score extends React.Component<ScoreProps, undefined> {
    render() {
        return (
            <p>Score: {this.props.score}</p>
        );
    }
}

export default Score;