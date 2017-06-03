import React from 'react';
import { Sprite } from 'react-pixi';
import { WorldAction, Status, ZombiType } from '../World';
import PIXI from 'pixi.js';

const SPRITE_SIZE = 50;
const GAME_SIZE = 8;
const yTop = 400;

const textures = [
    'assets/images/Zombi_blue.png',
    'assets/images/Zombi_brown.png',
    'assets/images/Zombi_green.png',
    'assets/images/Zombi_grey.png',
    'assets/images/Zombi_red.png',
    'assets/images/Zombi_white.png',
    'assets/images/Zombi_yellow.png',
    'assets/images/Zombi_electric.png',
    'assets/images/tile.png',
    'assets/images/Grenade_Blue.png',
    'assets/images/Grenade_Brown.png',
    'assets/images/Grenade_Green.png',
    'assets/images/Grenade_Grey.png',
    'assets/images/Grenade_Red.png',
    'assets/images/Grenade_White.png',
    'assets/images/Grenade_Yellow.png',
    'assets/images/Saw_Blue.png',
    'assets/images/Saw_Brown.png',
    'assets/images/Saw_Green.png',
    'assets/images/Saw_Grey.png',
    'assets/images/Saw_Red.png',
    'assets/images/Saw_White.png',
    'assets/images/Saw_Yellow.png',
    'assets/images/Nuclear_Blue.png',
    'assets/images/Nuclear_Brown.png',
    'assets/images/Nuclear_Green.png',
    'assets/images/Nuclear_Grey.png',
    'assets/images/Nuclear_Red.png',
    'assets/images/Nuclear_White.png',
    'assets/images/Nuclear_Yellow.png'
];

const assetPath = (zombiType: number, color: number) => {
    let textureOffset = 0;
    switch (zombiType){
        case undefined:
            break;
        case ZombiType.Grenade: {
            textureOffset = 9;
            break;
        }
        case ZombiType.Saw: {
            textureOffset = 16;
            break;
        }
        case ZombiType.Nuclear: {
            textureOffset = 23;
            break;
        }
    }
    return textures[textureOffset + color];
}

interface ZombiProps {
    id: number;
    x: number;
    y: number;
    color: number;
    status: Status;
    animation: number;
    zombiType: number;
    dispatch: (action: WorldAction) => void;
}

const ortoNorm = (x: number, y: number) => {
    const xSign = Math.sign(x);
    const ySign = Math.sign(y);
    const xLength = Math.abs(x);
    const yLength = Math.abs(y);
    if (Math.max(xLength, yLength) < 25) return null;
    return xLength > yLength ? 
        {i: xSign, j: 0} :
        {i: 0, j: ySign};
};

const xToi = (x: number) => x * GAME_SIZE;
const yToj = (y: number) => y * GAME_SIZE;

class Zombi extends React.Component<ZombiProps, undefined> {
    pointDown: PIXI.Point;
    handleMouseDown = (event: PIXI.interaction.InteractionEvent) => {
        this.pointDown = event.data.getLocalPosition(event.target.parent);
    }
    handleMouseUp = (event: PIXI.interaction.InteractionEvent) => {
        if (!this.pointDown) return;
        const pointUp = event.data.getLocalPosition(event.target.parent);
        const direction = ortoNorm(
            pointUp.x - this.pointDown.x, 
            pointUp.y - this.pointDown.y
        );
        const position = {
            i: xToi(this.props.x),
            j: yToj(this.props.y)
        };
        if (direction){
            const action: WorldAction = {
                type: 'swipe',
                value: { position, direction }
            };
            this.props.dispatch(action);
        }
        this.pointDown = null;
    }
    render() {
        return (
            <Sprite
                image = {assetPath(this.props.zombiType, this.props.color)}
                x = {this.props.x * 400}
                y = {this.props.y * 400}
                interactive = {this.props.status === Status.Idle}
                mousedown = {this.handleMouseDown}
                mouseup = {this.handleMouseUp}
                mouseupoutside = {this.handleMouseUp}
                anchor = "0,1"
                scale = "1,-1"
                alpha = {
                    this.props.animation == undefined ? 1 :
                    1 - this.props.animation
                }
            />
        );
    }
}

export default Zombi;