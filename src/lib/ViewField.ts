import * as PIXI from 'pixi.js';
import * as CSP from './CSPWrapper';
import * as Field from '../../src/lib/Field';

const textures = [
    'assets/blue.png',
    'assets/brown.png',
    'assets/green.png',
    'assets/grey.png',
    'assets/red.png',
    'assets/white.png',
    'assets/yellow.png',
    'assets/tile.png'
];

const loadDOM = () => {
    return new Promise(resolve => {
        window.addEventListener('DOMContentLoaded', resolve);
    });
};

const loadTextures = (textures: string[]) => {
    return new Promise(resolve => {
        PIXI.loader.add(textures).load(resolve);
    });
};

interface Sprite {
    x: number;
    y: number;
}

interface SpriteOptions {
    x: number;
    y: number;
    texture: string;
    interactive?: boolean;
}

const createEngine = () => {
    const renderer = PIXI.autoDetectRenderer(400, 400);
    const viewElement = document.getElementById('view');
    viewElement.appendChild(renderer.view);
    const stage = new PIXI.Container();

    const createSprite = (options: SpriteOptions) => {
        const sprite = new PIXI.Sprite(
            PIXI.loader.resources[options.texture].texture
        );
        sprite.x = options.x;
        sprite.y = options.y;
        if (options.interactive !== false){
            sprite.interactive = true;
        }
        stage.addChild(sprite);
        return sprite as Sprite;
    };

    const maxFramesCount = 10;
    let averageFrameTime = 0;
    let lastFrame = (new Date).getTime();
    let thisFrame = 0;
    let framesCount = 0;

    const animate = () => {
        window.requestAnimationFrame(animate);
        let thisFrameTime = (thisFrame = (new Date).getTime()) - lastFrame;
        if (framesCount < maxFramesCount) framesCount++;
        averageFrameTime += (thisFrameTime - averageFrameTime) / framesCount;
        lastFrame = thisFrame;
        renderer.render(stage);
    }

    const fps = document.getElementById('fps');
    setInterval(function(){
        fps.innerHTML = 'Fps: ' + (1000 / averageFrameTime).toFixed();
    }, 100);
    return {
        createSprite,
        start: animate
    };
};

const pipe = (viewFieldInChannel: CSP.Channel) => {
    const viewFieldOutChannel = CSP.createChannel();
    (async () => {
        await loadDOM();
        const engine = createEngine();
        await loadTextures(textures);
        engine.start();

        const SPRITE_SIZE = 50;
        const GAME_SIZE = 8;
        const xLeft = 0;
        const yTop = 0;
        const yBottom = 400;

        for (var i = 0; i < GAME_SIZE / 2; i++){
            for (var j = 0; j < GAME_SIZE / 2; j++){
                engine.createSprite({
                    texture: 'assets/tile.png',
                    x: xLeft + i * 2 * SPRITE_SIZE,
                    y: yTop + j * 2 * SPRITE_SIZE,
                    interactive: false
                });
            }
        }

        while (true){
            const message = await viewFieldInChannel.take();
            if (message === CSP.DONE){
                viewFieldOutChannel.close();
                break;
            }
            const task = message.value as Field.Task;
            switch (task.action) {
                case Field.TaskAction.CreateZombi: {
                    const sprite = engine.createSprite({
                        texture: textures[task.additional.colour],
                        x: xLeft + task.i * SPRITE_SIZE,
                        y: yBottom - (task.j + 1) * SPRITE_SIZE
                    });
                }
            }
        }
    })();
    return viewFieldOutChannel;
};

export {
    pipe,
}