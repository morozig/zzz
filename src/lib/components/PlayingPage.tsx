import React from 'react';
import Field from './Field';
import Score from './Score';
import {
    WorldState,
    World,
    createWorld,
    WorldAction,
    ZombizMap
} from '../World';

interface PlayingPageState {
    data: WorldState
}

class PlayingPage extends React.Component<undefined, PlayingPageState> {
    world: World;
    dispatch = (action: WorldAction) => {
        this.world.dispatch(action);
    };
    constructor() {
        super();
        this.state = {
            data: null
        };
    }
    componentDidMount() {
        this.world = createWorld();
        (async () => {
            while (true){
                const worldState = await this.world.outChannel.take();
                this.setState({data: worldState});
            }
        })();
    }
    render() {
        const data = this.state.data;
        const zombiz = data && data.get('zombiz') as ZombizMap;
        const score = data && data.get('score') as number;
        return (
            <div>
                <Score
                    score = {score}
                />
                <Field
                    zombiz = {zombiz}
                    dispatch = {this.dispatch}
                />
                <p>Health: 100%</p>
            </div>
        );
    }
}

export default PlayingPage;