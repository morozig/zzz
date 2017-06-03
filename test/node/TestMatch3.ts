import { expect } from 'chai';
import * as Match3 from '../../src/lib/Match3';

// const describe = (message: string, test: () => void) => {test()};
// const it = (message: string, test: () => void) => {test()};

function equalGroups(a: {}[][], b: {}[][]) {
    if (a.length !== b.length) return false;
    for (let groupA of a){
        if (!b.some((groupB) => {
            if (groupB.length !== groupA.length) return false;
            return groupB.every((element) => {
                return groupA.indexOf(element) !== -1
            });
        })) return false;
    }
    return true;
}

function equalArrays(a: {}[], b: {}[]) {
    if (a.length !== b.length) return false;
    return (a.every((element) => b.includes(element))) &&
        (b.every((element) => a.includes(element)));
}

const fromMatrix = (example: number[][]) => {
    const width = example[0].length;
    const begin = new Array(width).fill([]);
    const elements = example
        .reduceRight((prev, current) => {
            return prev.map((colomn, index) => {
                const number = current[index];
                if (number === null) return colomn.concat(null);
                const color = Math.floor(number);
                const status = (number - color) * 10;
                return colomn.concat({color, status});
            })
        }, begin as Match3.Element[][]);
    return elements;
};

const create = (size: number) => {
    const elements: Match3.Element[][] = [];
    const colors = Match3.generateColors(size);
    for (let i = 0; i < size; i++){
        elements[i] = [];
        for (let j = 0; j < size; j++){
            const color = colors[i][j];
            const status = Match3.Status.Idle;
            const element: Match3.Element = {color, status};
            elements[i][j] = element;
        }
    }
    return elements;
};

describe ('Match3', () => {
    describe('.find()', () => {
        it('should work on example 1', () => {
            const elements = fromMatrix([
                [0],
                [0],
                [0]
            ]);
            const actual = Match3.find(elements);
            const expected = elements;
            const areEqual = equalGroups(actual, expected);
            expect(areEqual).to.be.true;
        });
        it('should work on example 2', () => {
            const elements = fromMatrix([
                [2, 2, 2]
            ]);
            const actual = Match3.find(elements);
            const expected = [elements.map(colomn => colomn[0])];
            const areEqual = equalGroups(actual, expected);
            expect(areEqual).to.be.true;
        });
        it('should work on example 3', () => {
            const elements = fromMatrix([
                [0, 1, 0]
            ]);
            const actual = Match3.find(elements);
            const expected:{}[][] = [];
            const areEqual = equalGroups(actual, expected);
            expect(areEqual).to.be.true;
        });
        it('should work on example 4', () => {
            const elements = fromMatrix([
                [5, 3, 3, 3, 3],
                [5, 4, 2, 2, 2],
                [5, 4, 3, 1, 1],
                [5, 4, 3, 2, 0],
                [5, 4, 3, 2, 1]
            ]);
            const actual = Match3.find(elements);
            const expected:{}[][] = [
                elements[0],
                elements[1].slice(0, -1),
                elements[2].slice(0, 3),
                elements.map(colomn => colomn[4]).slice(1),
                elements.map(colomn => colomn[3]).slice(2)
            ];
            const areEqual = equalGroups(actual, expected);
            expect(areEqual).to.be.true;
        });
        it('should work on example 5', () => {
            const elements = fromMatrix([
                [1, 1, 1, 3.1, 3.1, 3.1, 2, 2, 2],
            ]);
            const actual = Match3.find(elements);
            const expected:{}[][] = [
                elements.map(colomn => colomn[0]).slice(0, 3),
                elements.map(colomn => colomn[0]).slice(-3)
            ];
            const areEqual = equalGroups(actual, expected);
            expect(areEqual).to.be.true;
        });
        it('should work on example 6', () => {
            const elements = fromMatrix([
                [0, 1, 0],
                [1, 1, 1],
                [0, 1, 0]
            ]);
            const actual = Match3.find(elements);
            const expected:{}[][] = [
                elements[1].concat(elements[0][1], elements[2][1])
            ];
            const areEqual = equalGroups(actual, expected);
            expect(areEqual).to.be.true;
        });
        it('should work on example 7', () => {
            const elements = fromMatrix([
                [0, 1, 1, 1],
                [1, 0, 0, 1],
                [1, 0, 0, 1],
                [1, 1, 1, 1]
            ]);
            const actual = Match3.find(elements);
            const expected:{}[][] = [
                elements[3].concat(
                    elements[0].slice(0, -1),
                    elements[1][0], elements[1][3],
                    elements[2][0], elements[2][3]
                )
            ];
            const areEqual = equalGroups(actual, expected);
            expect(areEqual).to.be.true;
        });
        it('should work on example 8', () => {
            const elements = fromMatrix([
                [1, 1, 1],
                [1, 1, 1],
                [1, 1, 1]
            ]);
            const actual = Match3.find(elements);
            const expected:{}[][] = [
                elements.reduce((prev, current) => prev.concat(current))
            ];
            const areEqual = equalGroups(actual, expected);
            expect(areEqual).to.be.true;
        });
        it('should work on example 9', () => {
            const elements = fromMatrix([
                [1, 1, 1, 1],
                [1, 0, 0, 0],
                [1, 1, 1, 0],
                [1, 0, 0, 0],
                [1, 1, 1, 1]
            ]);
            const actual = Match3.find(elements);
            const expected:{}[][] = [
                elements[0].concat(
                    elements.map(colomn => colomn[4]).slice(1),
                    elements.map(colomn => colomn[2]).slice(1, 3),
                    elements.map(colomn => colomn[0]).slice(1)
                ),
                [elements[3][2]].concat(
                    elements.map(colomn => colomn[3]).slice(1),
                    elements.map(colomn => colomn[1]).slice(1)
                )
            ];
            const areEqual = equalGroups(actual, expected);
            expect(areEqual).to.be.true;
        });
    });
    describe('.gravitate()', () => {
        it('should work on example 1', () => {
            const elements = fromMatrix([
                [0],
                [0],
                [0]
            ]);
            const actual = Match3.gravitate(elements);
            const expected = {
                toFall: [],
                toIdle: [],
                toNull: []
            } as Match3.Difference;
            expect(actual).to.deep.equal(expected);
        });
        it('should work on example 2', () => {
            const elements = fromMatrix([
                [0.2],
                [0.2],
                [0.2]
            ]);
            const actual = Match3.gravitate(elements);
            const expected = {
                toFall: [],
                toIdle: [[true, true, true]],
                toNull: []                
            } as Match3.Difference;
            expect(actual).to.deep.equal(expected);
        });
        it('should work on example 3', () => {
            const elements = fromMatrix([
                [0.1],
                [0.1],
                [0.3]
            ]);
            const actual = Match3.gravitate(elements);
            const expected = {
                toFall: [],
                toIdle: [],
                toNull: [[true]]
            } as Match3.Difference;
            expect(actual).to.deep.equal(expected);
        });
        it('should work on example 4', () => {
            const elements = fromMatrix([
                [0.1],
                [0.1],
                [null]
            ]);
            const actual = Match3.gravitate(elements);
            const expected = {
                toFall: [],
                toIdle: [],
                toNull: [[true]]
            } as Match3.Difference;
            expect(actual).to.deep.equal(expected);
        });
        it('should work on example 5', () => {
            const elements = fromMatrix([
                [0.2],
                [0.2],
                [0.3]
            ]);
            const actual = Match3.gravitate(elements);
            const expected = {
                toFall: [[, 1, 1, 1]],
                toIdle: [],
                toNull: []
            } as Match3.Difference;
            expect(actual).to.deep.equal(expected);
        });
        it('should work on example 6', () => {
            const elements = fromMatrix([
                [0],
                [0],
                [0.3]
            ]);
            const actual = Match3.gravitate(elements);
            const expected = {
                toFall: [[, 1, 1, 1]],
                toIdle: [],
                toNull: []
            } as Match3.Difference;
            expect(actual).to.deep.equal(expected);
        });
        it('should work on example 7', () => {
            const elements = fromMatrix([
                [0.2],
                [0.2],
                [0.1]
            ]);
            const actual = Match3.gravitate(elements);
            const expected = {
                toFall: [],
                toIdle: [[, true, true]],
                toNull: []
            } as Match3.Difference;
            expect(actual).to.deep.equal(expected);
        });
        it('should work on example 8', () => {
            const elements = fromMatrix([
                [0.3],
                [0.3],
                [0.3]
            ]);
            const actual = Match3.gravitate(elements);
            const expected = {
                toFall: [[, , , 3, 3, 3]],
                toIdle: [],
                toNull: []
            } as Match3.Difference;
            expect(actual).to.deep.equal(expected);
        });
        it('should work on example 9', () => {
            const elements = fromMatrix([
                [0],
                [0.3],
                [0],
                [0.3],
                [0],
                [0.3],
                [0],
                [0.3]
            ]);
            const actual = Match3.gravitate(elements);
            const expected = {
                toFall: [[, 1, , 2, , 3, , 4, 4, 4, 4, 4]],
                toIdle: [],
                toNull: []
            } as Match3.Difference;
            expect(actual).to.deep.equal(expected);
        });
        it('should work on example 10', () => {
            const elements = fromMatrix([
                [0.1],
                [0.1],
                [0.1],
                [0],
                [0.3],
                [0.3],
                [0.3]
            ]);
            const actual = Match3.gravitate(elements);
            const expected = {
                toFall: [[, , , 3]],
                toIdle: [],
                toNull: [[, true, true, true]]
            } as Match3.Difference;
            expect(actual).to.deep.equal(expected);
        });
    });
    describe('.generateColors()', () => {
        it('should not contain groups', () => {
            const elements = create(8);
            const actual = Match3.find(elements);
            const expected:{}[][] = [];
            const areEqual = equalGroups(actual, expected);
            expect(areEqual).to.be.true;
        });
        it('should generate 8x8 array', () => {
            const elements = create(8);
            const width = elements.length;
            const height = elements[0].length;
            const actual = {width, height};
            const expected = {
                width: 8,
                height: 8
            };
            expect(actual).to.deep.equal(expected);
        });
        it('should contain hints', () => {
            const elements = create(8);
            const hints = Match3.hint(elements);
            const areHintsFound = hints.length > 0;
            expect(areHintsFound).to.be.true;
        });
    });
    describe('.hints()', () => {
        it('should work on example 1', () => {
            const elements = fromMatrix([
                [0],
                [0],
                [0]
            ]);
            const actual = Match3.hint(elements);
            const expected:{}[] = [];
            const areEqual = equalArrays(actual, expected);
            expect(areEqual).to.be.true;
        });
        it('should work on example 2', () => {
            const elements = fromMatrix([
                [0, 1],
                [1, 2],
                [0, 1]
            ]);
            const actual = Match3.hint(elements);
            const expected:{}[] = [elements[0][1], elements[1][1]];
            const areEqual = equalArrays(actual, expected);
            expect(areEqual).to.be.true;
        });
        it('should work on example 3', () => {
            const elements = fromMatrix([
                [0, 1],
                [1, 0],
                [0, 1]
            ]);
            const actual = Match3.hint(elements);
            const expected:{}[] = [elements[0][1], elements[1][1]];
            const areEqual = equalArrays(actual, expected);
            expect(areEqual).to.be.true;
        });
        it('should work on example 4', () => {
            const elements = fromMatrix([
                [0, 1],
                [2, 0],
                [0, 1]
            ]);
            const actual = Match3.hint(elements);
            const expected:{}[] = [elements[0][1], elements[1][1]];
            const areEqual = equalArrays(actual, expected);
            expect(areEqual).to.be.true;
        });
        it('should work on example 5', () => {
            const elements = fromMatrix([
                [1, 0],
                [0, 1],
                [0, 2]
            ]);
            const actual = Match3.hint(elements);
            const expected:{}[] = [elements[0][2], elements[1][2]];
            const areEqual = equalArrays(actual, expected);
            expect(areEqual).to.be.true;
        });
        it('should work on example 6', () => {
            const elements = fromMatrix([
                [1, 0, 0],
                [0, 1, 2]
            ]);
            const actual = Match3.hint(elements);
            const expected:{}[] = [elements[0][0], elements[0][1]];
            const areEqual = equalArrays(actual, expected);
            expect(areEqual).to.be.true;
        });
        it('should work on example 7', () => {
            const elements = fromMatrix([
                [1, 0, 1],
                [0, 1, 0]
            ]);
            const actual = Match3.hint(elements);
            const expected:{}[] = [elements[1][0], elements[1][1]];
            const areEqual = equalArrays(actual, expected);
            expect(areEqual).to.be.true;
        });
        it('should work on example 8', () => {
            const elements = fromMatrix([
                [1, 0, 1, 2, 2],
                [0, 0, 1, 3, 2],
                [1, 2, 2, 3, 1],
                [3, 2, 2, 0, 4],
                [0, 0, 1, 1, 2]
            ]);
            const actual = Match3.hint(elements);
            const expected:{}[] = [];
            const areEqual = equalArrays(actual, expected);
            expect(areEqual).to.be.true;
        });
        it('should work on example 9', () => {
            const elements = fromMatrix([
                [1, 0, 1, 2, 2],
                [0, 0, 1, 3, 2],
                [1, 2, 0, 3, 1],
                [3, 2, 1, 0, 1],
                [0, 0, 1, 1, 2]
            ]);
            const actual = Match3.hint(elements);
            const expected:{}[] = [
                    elements[2][2],
                    elements[2][3],
                    elements[1][2],
                    elements[2][1],
                    elements[3][0],
                    elements[3][1],
                    elements[4][1],
                    elements[4][0]
            ];
            const areEqual = equalArrays(actual, expected);
            expect(areEqual).to.be.true;
        });
    });
});