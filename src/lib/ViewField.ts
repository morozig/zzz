import * as CSP from './CSPWrapper';
import * as Field from '../../src/lib/Field';
import * as TWEEN from 'tween.js';

const textures = [
    'assets/images/blue.png',
    'assets/images/brown.png',
    'assets/images/green.png',
    'assets/images/grey.png',
    'assets/images/red.png',
    'assets/images/white.png',
    'assets/images/yellow.png',
    'assets/images/tile.png'
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

interface Point {
    x: number;
    y: number;
}

interface Sprite extends Point{
    interactive: boolean;
}

interface SpriteOptions {
    x: number;
    y: number;
    texture: string;
    interactive?: boolean;
}

const enum InputEventType {
    MouseDown,
    MouseUp
}

interface InputEvent{
    sprite: Sprite;
    type: InputEventType,
    x: number,
    y: number
}

const createEngine = () => {
    const renderer = PIXI.autoDetectRenderer(400, 400);
    const viewElement = document.getElementById('view');
    viewElement.appendChild(renderer.view);
    const stage = new PIXI.Container();
    const inputChannel = CSP.createChannel();
    const tilesPerSecond = 10;

    const createSprite = (options: SpriteOptions) => {
        const sprite = new PIXI.Sprite(
            PIXI.loader.resources[options.texture].texture
        );
        sprite.x = options.x;
        sprite.y = options.y;
        if (options.interactive !== false){
            sprite.interactive = true;
        }
        const eventHandler = (event: PIXI.interaction.InteractionEvent) => {
            const point = event.data.getLocalPosition(stage);
            const type = (event.type === 'mousedown') ? 
                InputEventType.MouseDown : InputEventType.MouseUp;
            inputChannel.put({
                topic: CSP.Topic.InputEvent,
                value: {
                    sprite: event.target,
                    type: type,
                    x: point.x,
                    y: point.y
                } as InputEvent
            });
        };
        sprite.on('mousedown', eventHandler);
        sprite.on('mouseup', eventHandler);
        sprite.on('mouseupoutside', eventHandler);
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
        TWEEN.update();
        renderer.render(stage);
    }

    const tween = (sprite: Sprite, to: Point, callback: () => void) => {
        const distance = Math.sqrt(
            Math.pow(to.x - sprite.x, 2) + Math.pow(to.y - sprite.y, 2) 
        );
        const time = distance / 50 / tilesPerSecond * 1000;
        const spriteCopy = {
            x: sprite.x,
            y: sprite.y
        } as Point;
        const toCopy = {
            x: to.x,
            y: to.y
        } as Point;
        new TWEEN.Tween(spriteCopy)
            .to(toCopy, time)
            .start()
            .onUpdate(() => {
                sprite.x = spriteCopy.x;
                sprite.y = spriteCopy.y;
            })
            .onComplete(callback);
    };
    const fps = document.getElementById('fps');
    setInterval(function(){
        fps.innerHTML = 'Fps: ' + (1000 / averageFrameTime).toFixed();
    }, 100);
    return {
        createSprite,
        start: animate,
        inputChannel,
        tween
    };
};

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

        const xToi = (x: number) => (x - xLeft) / SPRITE_SIZE;
        const yToj = (y: number) => (yBottom - y) / SPRITE_SIZE - 1;
        const iTox = (i: number) => xLeft + i * SPRITE_SIZE;
        const jToy = (j: number) => yBottom - (j + 1) * SPRITE_SIZE

        for (let i = 0; i < GAME_SIZE / 2; i++){
            for (let j = 0; j < GAME_SIZE / 2; j++){
                const sprite = engine.createSprite({
                    texture: 'assets/images/tile.png',
                    x: xLeft + i * 2 * SPRITE_SIZE,
                    y: yTop + j * 2 * SPRITE_SIZE,
                    interactive: false
                });
            }
        }

        const zombiz: Sprite[][] = [];
        for (let i = 0; i < GAME_SIZE; i++) zombiz[i] = [];
        (async () => {
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
                            texture: textures[task.colour],
                            x: iTox(task.i),
                            y: jToy(task.j)
                        });
                        zombiz[task.i][task.j] = sprite;
                        break;
                    }
                    case Field.TaskAction.Move: {
                        const sprite = zombiz[task.i][task.j];
                        const to = zombiz[task.to.i][task.to.j];
                        sprite.interactive = false;
                        engine.tween(sprite, to, () => {
                            sprite.interactive = true;
                            zombiz[task.to.i][task.to.j] = sprite;
                            viewFieldOutChannel.put({
                                topic: CSP.Topic.FieldTaskDone,
                                value: task
                            });
                        });
                        break;
                    }
                }
            }
        })();

        (async () => {
            let isMouseDown = false;
            let currentSprite: Sprite = undefined;
            let xDown: number;
            let yDown: number;
            while (true){
                const message = await engine.inputChannel.take();
                if (message === CSP.DONE){
                    viewFieldOutChannel.close();
                    break;
                }
                const event = message.value as InputEvent;
                switch (event.type) {
                    case InputEventType.MouseDown: {
                        isMouseDown = true;
                        currentSprite = event.sprite;
                        xDown = event.x;
                        yDown = event.y;
                        break;
                    }
                    case InputEventType.MouseUp:{
                        if (isMouseDown){
                            isMouseDown = false;
                            const xUp = event.x;
                            const yUp = event.y;
                            const direction = ortoNorm(
                                xUp - xDown, -yUp + yDown
                            );
                            if (!direction) break;
                            const i = xToi(currentSprite.x);
                            const j = yToj(currentSprite.y);
                            viewFieldOutChannel.put({
                                topic: CSP.Topic.Swipe,
                                value: {i, j, direction} as Field.Swipe
                            });
                            break;
                        }
                    }
                }
            }
        })();
    })();
    return viewFieldOutChannel;
};

export {
    pipe,
}