/// <reference path="../node/node.d.ts"/>
import { expect } from 'chai';

describe('title', function () {
    it('should be "Hello World!"', function () {
        expect(document.title).to.equal('Hello World!');
    });
});