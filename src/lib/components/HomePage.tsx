import React from 'react';
import { Action } from '../GameReducer';

interface HomePageProps {
    dispatch: (action: Action) => void;
}

class HomePage extends React.Component<HomePageProps, undefined> {
    private handleClick = () => {
        this.props.dispatch({
            value: 'play'
        });
    };

    render() {
        return (
            <div>
                <h1>ZombiZombiZombi</h1>
                <button onClick = {this.handleClick}>
                    Play
                </button>
            </div>
        );
    }
}

export default HomePage;