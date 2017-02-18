import { expect } from 'chai';
import { timeout } from '../../src/lib/CSPWrapper';
import resemble from 'resemblejs';

const compare = (image1: ImageData, image2: ImageData) => {
    return new Promise<any>(resolve => {
        const resembleControl = resemble(image1).compareTo(image2)
            .ignoreLess()
            .onComplete(resolve);
    });
};

const analyse = (image1: ImageData) => {
    return new Promise<any>(resolve => {
        resemble(image1)
            .onComplete(resolve)
            .ignoreColors();
    });
};

describe('view', () => {
    it('should contain canvas', () => {
        const viewElement = document.getElementById('view');
        const nodeName = viewElement.firstChild.nodeName;
        const actual = nodeName;
        const expected = 'CANVAS';
        expect(actual).to.equal(expected);
    });
    it('should be 400 X 400', () => {
        const viewElement = document.getElementById('view');
        const canvasElement = viewElement.firstChild as HTMLCanvasElement;
        const size = {
            width: canvasElement.width,
            height: canvasElement.height
        };
        const actual = size;
        const expected = {
            width: 400,
            height: 400
        };
        expect(actual).to.deep.equal(expected);
    });
    it('should not be black', async () => {
        const viewElement = document.getElementById('view');
        const canvasElement = viewElement.firstChild as HTMLCanvasElement;
        let isBlack = true;
        while (isBlack){
            await timeout(50);
            const screenShot = canvasElement
                .getContext("2d")
                .getImageData(0, 0, 400, 400);
            const colours = await analyse(screenShot);
            isBlack = colours.red + colours.green + colours.blue === 0;
        }
        expect(isBlack).to.equal(false);
    });
    it('should change over time', async () => {
        await timeout(100);
        const viewElement = document.getElementById('view');
        const canvasElement = viewElement.firstChild as HTMLCanvasElement;
        const canvasOffsetTop = canvasElement.offsetTop;
        const canvasOffsetLeft = canvasElement.offsetLeft;

        function mouseEvent(type: string, cx: number, cy: number) {
            var evt: any;
            var e = {
                bubbles: true,
                cancelable: (type != "mousemove"),
                view: window,
                detail: 0,
                screenX: 0, 
                screenY: 0,
                clientX: cx, 
                clientY: cy,
                ctrlKey: false,
                altKey: false,
                shiftKey: false,
                metaKey: false,
                button: 0,
                relatedTarget: <EventTarget> undefined
            };
            if (typeof( document.createEvent ) == "function") {
                evt = document.createEvent("MouseEvents");
                evt.initMouseEvent(type, 
                e.bubbles, e.cancelable, e.view, e.detail,
                e.screenX, e.screenY, e.clientX, e.clientY,
                e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
                e.button, document.body.parentNode);           
            }
            return evt;
        }
        function dispatchEvent (el: any, type: any, evt: any) {
            if (el.dispatchEvent) {
                el.dispatchEvent(evt);
            } else if (el.fireEvent) {
                el.fireEvent('on' + type, evt);
            }
            return evt;
        }
        const trigger = (type: string, x: number, y: number) => {
            const evt = mouseEvent(
                type,
                x + canvasOffsetLeft,
                y + canvasOffsetTop
            );
            dispatchEvent(canvasElement, type, evt);
        };

        const screenShot1 = canvasElement
            .getContext("2d")
            .getImageData(0, 0, 400, 400);

        trigger('mousedown', 25, 375);
        await timeout(10);
        trigger('mouseup', 25, 325);
        let areSame = true;
        while (areSame){
            await timeout(100);
            const screenShot2 = canvasElement
                .getContext("2d")
                .getImageData(0, 0, 400, 400);
            const diff = await compare(screenShot1, screenShot2);
            areSame = diff.misMatchPercentage === 0;
        }

        expect(areSame).to.equal(false);
    });
});