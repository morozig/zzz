import React from 'react';
import { DisplayObjectContainer, Sprite} from 'react-pixi';

const SPRITE_SIZE = 50;
const GAME_SIZE = 8;
const xLeft = 0;
const yTop = 0;
const yBottom = 400;

const tileSprites: any[] = [];

for (let i = 0; i < GAME_SIZE / 2; i++){
    for (let j = 0; j < GAME_SIZE / 2; j++){
        tileSprites.push(<Sprite
            key = {'' + i + j}
            image = 'assets/images/tile.png'
            x = {xLeft + i * 2 * SPRITE_SIZE}
            y = {yTop + j * 2 * SPRITE_SIZE}
            interactive = {false}
        />);
    }
}

class Background extends React.Component<undefined, undefined> {
    render() {
        return (
            <DisplayObjectContainer>
                {tileSprites}
            </DisplayObjectContainer>
        );
    }
}

export default Background;