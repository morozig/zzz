import React from 'react';
import { Stage } from 'react-pixi';
import Background from './Background';
import Zombiz from './Zombiz';
import {
    WorldState,
    World,
    createWorld,
    WorldAction
} from '../World';

interface FieldState {
    data: WorldState
}

class Field extends React.Component<undefined, FieldState> {
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
        const flatZombiz = data && data
            .get('zombiz')
            .flatten(true)
            .toArray()
            .filter(zombi => zombi)
            .map(zombiMap => zombiMap.toJS());
        return (
            <Stage
                height = "400"
                width = "400"
                position = {{x: 0, y: 400}}
                scale = "1,-1"
            >
                <Background/>
                { data &&
                    <Zombiz
                        zombiz = {flatZombiz}
                        dispatch = {this.dispatch}
                    /> 
                }
            </Stage>
        );
    }
}

export default Field;