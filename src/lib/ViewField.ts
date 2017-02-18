import * as CSP from './CSPWrapper';
import * as Field from '../../src/lib/Field';
import TWEEN from 'tween.js';
import PIXI from 'pixi.js';

const TILES_PER_SECOND = 12;

const textures = [
    'assets/images/blue.png',
    'assets/images/brown.png',
    'assets/images/green.png',
    'assets/images/grey.png',
    'assets/images/red.png',
    'assets/images/white.png',
    'assets/images/yellow.png',
    'assets/images/electric.png',
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
    const inputChannel = CSP.createGenericChannel<InputEvent>();
    const tilesPerSecond = TILES_PER_SECOND;

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
                sprite: event.target,
                type: type,
                x: point.x,
                y: point.y
            } as InputEvent);
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
    const destroy = (sprite: Sprite, callback: () => void) => {
        const pixiSprite = sprite as PIXI.Sprite;
        const time = 100 / 50 / tilesPerSecond * 1000;
        const spriteCopy = {
            alpha: pixiSprite.alpha
        };
        new TWEEN.Tween(spriteCopy)
            .to({alpha: 0}, time)
            .start()
            .onUpdate(() => {
                pixiSprite.alpha = spriteCopy.alpha;
            })
            .onComplete(() =>{
                pixiSprite.destroy();
                callback();
            });
    };
    const remove = (sprite: Sprite) => {
        const pixiSprite = sprite as PIXI.Sprite;
        pixiSprite.destroy();
    };
    const fps = document.getElementById('fps');
    const scoreElement = document.getElementById('score');
    const setScore = (score: Number) => {
        scoreElement.innerHTML = '' + score;
    };
    setInterval(function(){
        fps.innerHTML = '' + (1000 / averageFrameTime).toFixed();
    }, 100);
    return {
        createSprite,
        start: animate,
        inputChannel,
        tween,
        destroy,
        remove,
        setScore
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
        let points = 0;
        (async () => {
            while (true){
                const message = await viewFieldInChannel.take();
                if (message === CSP.DONE){
                    viewFieldOutChannel.close();
                    break;
                }
                if (message.topic === CSP.Topic.NewPoints){
                    points += message.value;
                    engine.setScore(points);
                    continue;
                }
                const task = message.value as Field.FieldTask;
                switch (task.action) {
                    case Field.TaskAction.CreateZombi: {
                        let textureOffset = 0;
                        switch (task.zombiType){
                            case undefined:
                                break;
                            case Field.ZombiType.Grenade: {
                                textureOffset = 9;
                                break;
                            }
                            case Field.ZombiType.Saw: {
                                textureOffset = 16;
                                break;
                            }
                            case Field.ZombiType.Nuclear: {
                                textureOffset = 23;
                                break;
                            }
                        }
                        const sprite = engine.createSprite({
                            texture: textures[textureOffset + task.colour],
                            x: iTox(task.i),
                            y: jToy(task.j)
                        });
                        zombiz[task.i][task.j] = sprite;
                        break;
                    }
                    case Field.TaskAction.Move: {
                        const sprite = zombiz[task.i][task.j];
                        const to: Point = {
                            x: iTox(task.to.i),
                            y: jToy(task.to.j)
                        }
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
                    case Field.TaskAction.Destroy: {
                        const sprite = zombiz[task.i][task.j];
                        sprite.interactive = false;
                        engine.destroy(sprite, () => {
                            viewFieldOutChannel.put({
                                topic: CSP.Topic.FieldTaskDone,
                                value: task
                            });
                        });
                        break;
                    }
                    case Field.TaskAction.Remove: {
                        const sprite = zombiz[task.i][task.j];
                        sprite.interactive = false;
                        engine.remove(sprite);
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
                const event = await engine.inputChannel.take();
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