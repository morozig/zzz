import React from 'react';
import Navigator from './Navigator';
import FPS from './FPS';
import Immutable from 'immutable';
import { Action, reducer } from '../GameReducer';

interface GameState {
    data: Immutable.Map<string, any>;
}

class Game extends React.Component<undefined, GameState> {
    dispatch = (action: Action) => {
        const data = reducer(
            this.state.data, action
        );
        this.setState({data});
    };
    constructor() {
        super();
        this.state = {
            data: reducer()
        };
    }
    render() {
        const data = this.state.data;
        return (
            <div>
                <FPS />
                <Navigator
                    page = {data.get('page')}
                    dispatch = {this.dispatch}
                />
            </div>
        );
    }
}

export default Game;