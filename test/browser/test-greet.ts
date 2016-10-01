/// <reference path="../node/node.d.ts"/>
import { expect } from 'chai';

describe('greeting', function () {
    it('should be "Hello from TypeScript"', function () {
        var elt = document.getElementById('greeting');
        expect(elt.textContent).to.equal('Hello from TypeScript');
    });
});