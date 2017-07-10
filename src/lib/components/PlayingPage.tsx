import React from 'react';
import Field from './Field';
import Score from './Score';
import Health from './Health';
import {
    WorldState,
    World,
    createWorld,
    WorldAction,
    ZombizMap,
    GamePhase
} from '../World';
import { Action } from '../GameReducer';

interface PlayingPageState {
    data: WorldState
}

interface PlayingPageProps {
    dispatch: (action: Action) => void;
}

class PlayingPage extends React.Component<PlayingPageProps, PlayingPageState> {
    world: World;
    worldDispatch = (action: WorldAction) => {
        this.world.dispatch(action);
    };
    home = () => {
        this.props.dispatch({
            value: 'home'
        });
    };
    start = () => {
        this.world = createWorld();
        (async () => {
            while (true){
                const worldState = await this.world.outChannel.take();
                this.setState({data: worldState});
            }
        })();
    };

    constructor() {
        super();
        this.state = {
            data: null
        };
    }
    componentDidMount() {
        this.start();
    }
    render() {
        const data = this.state.data;
        const zombiz = data && data.get('zombiz') as ZombizMap;
        const score = data && data.get('score') as number;
        const health = data && data.get('health') as number;
        const gamePhase = data && data.get('gamePhase') as GamePhase;
        return (gamePhase !== GamePhase.Over) ? (
            <div>
                <Score
                    score = {score}
                />
                <Field
                    zombiz = {zombiz}
                    dispatch = {this.worldDispatch}
                />
                <Health
                    health = {health}
                />
            </div>
        ) : (
            <div>
                <Score
                    score = {score}
                />
                <Field
                    zombiz = {zombiz}
                    dispatch = {this.worldDispatch}
                />
                <p>
                    <span>
                        <button onClick = {this.start}>
                            Restart
                        </button>
                        <button onClick = {this.home}>
                            Home
                        </button>
                    </span>
                </p>
            </div>
        );
    }
}

export default PlayingPage;