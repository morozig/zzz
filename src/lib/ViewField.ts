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
            console.log(point, type);
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
        renderer.render(stage);
    }

    const fps = document.getElementById('fps');
    setInterval(function(){
        fps.innerHTML = 'Fps: ' + (1000 / averageFrameTime).toFixed();
    }, 100);
    return {
        createSprite,
        start: animate,
        inputChannel
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

        const xToi = (x: number) => (x - xLeft) / SPRITE_SIZE;
        const yToj = (y: number) => (yBottom - y) / SPRITE_SIZE - 1;

        const ortoNorm = (x: number, y: number) => {
            var xSign = Math.sign(x);
            var ySign = Math.sign(y);
            var xLength = Math.abs(x);
            var yLength = Math.abs(y);
            if (Math.max(xLength, yLength) < 25) return null;
            return xLength > yLength ? 
                {i: xSign, j: 0} :
                {i: 0, j: ySign};
        };

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
                            texture: textures[task.additional.colour],
                            x: xLeft + task.i * SPRITE_SIZE,
                            y: yBottom - (task.j + 1) * SPRITE_SIZE
                        });
                        break;
                    }
                    case Field.TaskAction.Move: {
                        console.log(task);
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
                console.log(event);
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
                            console.log({i, j, direction});
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