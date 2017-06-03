import chai from 'chai';
import { expect } from 'chai';
import chaiImmutable from 'chai-immutable';
import { reducer, Action } from '../../src/lib/GameReducer';
import Immutable from 'immutable';
import * as CSP from '../../src/lib/CSPWrapper';

chai.use(chaiImmutable);

// const describe = (message: string, test: () => void) => {test()};
// const it = (message: string, test: () => void) => {test()};

describe ('GameReducer', () => {
    it('() should create data with Home page', () => {
        const actual = reducer();
        const expected = Immutable.Map<string, any>({page: 'Home'});
        expect(actual).to.equal(expected);
    });
    it('("play") should change page', () => {
        const data = reducer();
        const action: Action = {
            value: 'play'
        };
        const actual = reducer(data, action);
        const expected = Immutable.Map<string, any>({page: 'Playing'});
        expect(actual).to.equal(expected);
    });
});