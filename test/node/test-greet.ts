/// <reference path="node.d.ts"/>
import { sayHello } from "../../src/greet";
import { expect } from 'chai';

describe('greet', () => {
    it('should say "Hello from world"', () => {
        const world = sayHello('world');
        expect(world).to.equal('Hello from world');
    });
});
