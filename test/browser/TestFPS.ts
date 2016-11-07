import { expect } from 'chai';
import { timeout } from '../../src/lib/CSPWrapper';


describe('fps', () => {
    it('should be number between 0 and 100', async () => {
        const elt = $('#fps');
        const values: number[] = [];
        for (let i = 0; i < 3; i++){
            await timeout(50);
            let text = elt.text();
            let value = parseInt(text.match(/Fps: (\d+)/)[1]);
            values.push(value);
        }
        const actual = values.every(fps => fps > 0 && fps < 100);
        const expected = true;
        expect(actual).to.equal(expected);
    });
});