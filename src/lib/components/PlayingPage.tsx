import React from 'react';
import Field from './Field';

class PlayingPage extends React.Component<undefined, undefined> {
    render() {
        return (
            <div>
                <p>Score: 0</p>
                <Field/>
                <p>Health: 100%</p>
            </div>
        );
    }
}

export default PlayingPage;