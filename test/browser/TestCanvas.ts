import { expect } from 'chai';

describe('view', function () {
    it('should contain canvas', function () {
        const viewElement = document.getElementById('view');
        const nodeName = viewElement.firstChild.nodeName;
        const actual = nodeName;
        const expected = 'CANVAS';
        expect(actual).to.equal(expected);
    });
    it('should be 400 X 400', function () {
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
});