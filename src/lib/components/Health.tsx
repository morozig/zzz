import React from 'react';

interface HealthProps {
    health: number;
}

class Health extends React.Component<HealthProps, undefined> {
    render() {
        const roundedHealth = Math.floor(this.props.health);
        return (
            <p>Health: {roundedHealth}</p>
        );
    }
}

export default Health;