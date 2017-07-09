import React from 'react';
import { Stage } from 'react-pixi';
import Background from './Background';
import Zombiz from './Zombiz';
import {
    WorldAction,
    ZombizMap
} from '../World';

interface FieldProps {
    zombiz: ZombizMap;
    dispatch: (action: WorldAction) => void;
}

class Field extends React.Component<FieldProps, undefined> {
    render() {
        const zombiz: ZombizMap = this.props.zombiz;
        const flatZombiz = zombiz && zombiz
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
                { zombiz &&
                    <Zombiz
                        zombiz = {flatZombiz}
                        dispatch = {this.props.dispatch}
                    /> 
                }
            </Stage>
        );
    }
}

export default Field;