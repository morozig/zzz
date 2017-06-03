import React from 'react';
import { DisplayObjectContainer } from 'react-pixi';
import * as World from '../World';
import Zombi from './Zombi';

interface ZombizProps {
    zombiz: World.Zombi[];
    dispatch: (action: World.WorldAction) => void;
}

class Zombiz extends React.Component<ZombizProps, undefined> {
    render() {
        const zombizList = this.props.zombiz.map(zombi => 
            <Zombi
                key = {zombi.id}
                id = {zombi.id}
                x = {zombi.x}
                y = {zombi.y}
                color = {zombi.color}
                status = {zombi.status}
                animation = {zombi.animation}
                zombiType = {zombi.zombiType}
                dispatch = {this.props.dispatch}
            />
        );
        return (
            <DisplayObjectContainer>
                {zombizList}
            </DisplayObjectContainer>
        );
    }
}

export default Zombiz;