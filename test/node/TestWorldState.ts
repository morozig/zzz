import chai from 'chai';
import { expect } from 'chai';
import chaiImmutable from 'chai-immutable';
import {
    WorldState,
    WorldAction,
    Zombi,
    reducer,
    Status,
    TILES_PER_SECOND,
    ANIMATION_PER_SECOND,
    ZombiKeys,
    ZombiType,
    Swipe,
    ZombizMap,
    GamePhase
} from '../../src/lib/WorldReducer';
import Immutable from 'immutable';
import * as CSP from '../../src/lib/CSPWrapper';

chai.use(chaiImmutable);

// const describe = (message: string, test: () => void) => {test()};
// const it = (message: string, test: () => void) => {test()};

const fromMatrix = (example: number[][]) => {
    const width = example[0].length;
    const begin = new Array(width).fill([]);
    const elements = example
        .reduceRight((prev, current) => {
            return prev.map((colomn, index) => {
                const number = current[index];
                if (number === null) return colomn.concat(null);
                const color = Math.floor(number);
                const status = Math.round((number - color) * 10);
                return colomn.concat({ color, status });
            })
        }, begin);
    const zombiz: Zombi[][] = [];
    const height = elements[0].length;
    for (let i = 0; i < width; i++) {
        zombiz[i] = [];
        for (let j = 0; j < height; j++) {
            const element = elements[i][j];
            const zombi: Zombi = {
                color: element.color,
                id: i * width + j,
                i,
                j,
                status: element.status,
                x: i / width,
                y: j / height,
                zombiType: ZombiType.Normal
            };
            zombiz[i][j] = zombi;
        }
    }
    const score = 0;
    const health = 100;
    const gamePhase = GamePhase.Active;
    return Immutable.fromJS(
        {
            zombiz,
            score,
            health,
            gamePhase
        }) as WorldState;
};

const dropProperties = (worldState: WorldState, properties: ZombiKeys[]) => {
    return worldState.updateIn(
        ['zombiz'],
        zombiz => (zombiz as ZombizMap).map(
            colomn => colomn.map(
                zombi => zombi.withMutations(
                    zombi => {
                        let mutableZombi = zombi;
                        for (const property of properties) {
                            mutableZombi = mutableZombi.delete(property);
                        }
                        return mutableZombi;
                    }
                )
            )
        )
    );
};

describe('WorldReducer', () => {
    it('() should create 64 zombiz', () => {
        const worldState = reducer();
        const actual = (worldState.get('zombiz') as ZombizMap)
            .reduce((sum, colomn) => sum + colomn.size, 0);
        const expected = 64;
        expect(actual).to.equal(expected);
    });
    it('(swipe) should change 2 zombiz', () => {
        const worldState = fromMatrix([
            [1],
            [0]
        ]);
        const action: WorldAction = {
            type: 'swipe',
            value: {
                direction: {
                    i: 0,
                    j: 1
                },
                position: {
                    i: 0,
                    j: 0
                }
            }
        };
        const changed = reducer(worldState, action);
        const actual = dropProperties(changed, ['id', 'x', 'y', 'swipe']);
        const expected = dropProperties(
            fromMatrix([
                [0.1],
                [1.1]
            ]
            ), ['id', 'x', 'y']);
        expect(actual).to.equal(expected);
    });
    it('() should update y', () => {
        const worldState = fromMatrix([
            [1],
            [0]
        ])
            .setIn(['zombiz', 0, 1, 'x'], 0)
            .setIn(['zombiz', 0, 1, 'y'], 0)
            .setIn(['zombiz', 0, 1, 'status'], Status.Busy);
        const actual = reducer(worldState)
            .getIn(['zombiz', 0, 1, 'y']);
        const expected = TILES_PER_SECOND / 60 / 2;
        expect(actual).to.equal(expected);
    });
    it('() should update animation', () => {
        const worldState = fromMatrix([
            [1],
            [0]
        ])
            .setIn(['zombiz', 0, 0, 'status'], Status.Busy)
            .setIn(['zombiz', 0, 0, 'animation'], 0);
        const actual = reducer(worldState)
            .getIn(['zombiz', 0, 0, 'animation']);
        const expected = ANIMATION_PER_SECOND / 60;
        expect(actual).to.equal(expected);
    });
    it('() should set y to target position moving up', () => {
        const worldState = fromMatrix([
            [1],
            [0]
        ])
            .setIn(['zombiz', 0, 1, 'x'], 0)
            .setIn(['zombiz', 0, 1, 'y'], 0.49999)
            .setIn(['zombiz', 0, 1, 'status'], Status.Busy);
        const actual = reducer(worldState)
            .getIn(['zombiz', 0, 1, 'y']);
        const expected = 1 / 2;
        expect(actual).to.equal(expected);
    });
    it('() should set y to target position moving down', () => {
        const worldState = fromMatrix([
            [1],
            [0]
        ])
            .setIn(['zombiz', 0, 0, 'y'], 0.00001)
            .setIn(['zombiz', 0, 0, 'status'], Status.Busy);
        const actual = reducer(worldState)
            .getIn(['zombiz', 0, 0, 'y']);
        const expected = 0;
        expect(actual).to.equal(expected);
    });
    it('() should set status to falling', () => {
        const worldState = fromMatrix([
            [1],
            [0]
        ])
            .setIn(['zombiz', 0, 1, 'x'], 0)
            .setIn(['zombiz', 0, 1, 'y'], 0.49999)
            .setIn(['zombiz', 0, 1, 'status'], Status.Busy);
        const actual = reducer(worldState)
            .getIn(['zombiz', 0, 1, 'status']);
        const expected = Status.Falling;
        expect(actual).to.equal(expected);
    });
    it('(swipe) should not move into busy', () => {
        const worldState = fromMatrix([
            [1],
            [0]
        ]).setIn(['zombiz', 0, 1, 'status'], Status.Busy);
        const action: WorldAction = {
            type: 'swipe',
            value: {
                direction: {
                    i: 0,
                    j: 1
                },
                position: {
                    i: 0,
                    j: 0
                }
            }
        };
        const actual = reducer(worldState, action);
        const expected = worldState;
        expect(actual).to.equal(expected);
    });
    it('(swipe) should not move outside field', () => {
        const worldState = fromMatrix([
            [1],
            [0]
        ]);
        const action: WorldAction = {
            type: 'swipe',
            value: {
                direction: {
                    i: 0,
                    j: -1
                },
                position: {
                    i: 0,
                    j: 0
                }
            }
        };
        const actual = reducer(worldState, action);
        const expected = worldState;
        expect(actual).to.equal(expected);
    });
    it('() should shoot 3 zombiz', () => {
        const worldState = fromMatrix([
            [0.2],
            [0],
            [0]
        ]);
        const changed = reducer(worldState)
            .set('health', 100);
        const actual = dropProperties(changed, ['animation']);
        const expected = fromMatrix([
            [0.1],
            [0.1],
            [0.1]
        ]);;
        expect(actual).to.equal(expected);
    });
    it('() should create grenade', () => {
        const worldState = fromMatrix([
            [0.2],
            [0],
            [0],
            [0]
        ]);
        const changed = reducer(worldState);
        const actual = changed.getIn(['zombiz', 0, 1, 'create', 'zombiType']);
        const expected = ZombiType.Grenade;
        expect(actual).to.equal(expected);
    });
    it('() should spawn grenade', () => {
        const worldState = fromMatrix([
            [1],
            [0]
        ])
            .setIn(['zombiz', 0, 1, 'animation'], 0.99999)
            .setIn(['zombiz', 0, 1, 'status'], Status.Busy)
            .setIn(['zombiz', 0, 1, 'create'], Immutable.Map(
                {
                    zombiType: ZombiType.Grenade
                }
            ));
        const actual = reducer(worldState)
            .getIn(['zombiz', 0, 1, 'zombiType']);
        const expected = ZombiType.Grenade;
        expect(actual).to.equal(expected);
    });
    it('() should explode grenade', () => {
        const worldState = fromMatrix([
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0]
        ])
            .setIn(['zombiz', 1, 1, 'animation'], 0)
            .setIn(['zombiz', 1, 1, 'status'], Status.Busy)
            .setIn(['zombiz', 1, 1, 'zombiType'], ZombiType.Grenade);
        const actual = reducer(worldState)
            .getIn(['zombiz', 0, 0, 'status']);
        const expected = Status.Busy;
        expect(actual).to.equal(expected);
    });
    it('() should swap back', () => {
        const worldState = fromMatrix([
            [1],
            [0]
        ])
            .setIn(['zombiz', 0, 1, 'status'], Status.Swapped)
            .setIn(['zombiz', 0, 1, 'swipe'], Immutable.Map({
                i: 0,
                j: 0,
                direction: {
                    i: 0,
                    j: 1
                }
            }));
        const actual = reducer(worldState)
            .getIn(['zombiz', 0, 1, 'color']);
        const expected = 0;
        expect(actual).to.equal(expected);
    });
    it('() should create electric bomb', () => {
        const worldState = fromMatrix([
            [1.2],
            [0]
        ]);
        const actual = (reducer(worldState)
            .get('zombiz') as ZombizMap)
            .flatten(true)
            .filter(zombi => zombi.get('zombiType') === ZombiType.Electric)
            .count();
        const expected = 1;
        expect(actual).to.equal(expected);
    });
    it('(swipe) should explode electric bomb', () => {
        const worldState = fromMatrix([
            [1],
            [0]
        ])
            .setIn(['zombiz', 0, 0, 'zombiType'], ZombiType.Electric);
        const action: WorldAction = {
            type: 'swipe',
            value: {
                direction: {
                    i: 0,
                    j: 1
                },
                position: {
                    i: 0,
                    j: 0
                }
            }
        };
        const changed = reducer(worldState, action);
        const actual = dropProperties(
            changed,
            ['zombiType']
        );
        const expected = dropProperties(
            fromMatrix([
                [1.1],
                [0.1]
            ])
                .setIn(['zombiz', 0, 0, 'animation'], 0)
                .setIn(['zombiz', 0, 1, 'animation'], 0),
            ['zombiType']
        );
        expect(actual).to.equal(expected);
    });
    it('() should clear swapped status', () => {
        const worldState = fromMatrix([
            [0],
            [0],
            [0],
            [1.5]
        ])
            .setIn(['zombiz', 0, 0, 'swipe'], Immutable.Map({
                i: 0,
                j: 1,
                direction: {
                    i: 0,
                    j: -1
                }
            }));
        const actual = reducer(worldState)
            .getIn(['zombiz', 0, 0, 'status']);
        const expected = Status.Falling;
        expect(actual).to.equal(expected);
    });
    it('() should clear swapped status', () => {
        const worldState = fromMatrix([
            [0],
            [0],
            [0],
            [1.5]
        ])
            .setIn(['zombiz', 0, 0, 'swipe'], Immutable.Map({
                i: 0,
                j: 1,
                direction: {
                    i: 0,
                    j: -1
                }
            }));
        const actual = reducer(worldState)
            .getIn(['zombiz', 0, 0, 'status']);
        const expected = Status.Falling;
        expect(actual).to.equal(expected);
    });
    it('() should clear revert swipe on first row', () => {
        const worldState = fromMatrix([
            [1, 2, 3],
            [0.1, 0.1, 4],
            [5, 6, 7]
        ])
            .setIn(['zombiz', 0, 1, 'swipe'], Immutable.Map({
                i: 1,
                j: 1,
                direction: {
                    i: -1,
                    j: 0
                },
                revert: true
            }))
            .setIn(['zombiz', 1, 1, 'swipe'], Immutable.Map({
                i: 0,
                j: 1,
                direction: {
                    i: 1,
                    j: 0
                },
                revert: true
            }));
        const actual = reducer(worldState)
            .getIn(['zombiz', 0, 1, 'status']);
        const expected = Status.Falling;
        expect(actual).to.equal(expected);
    });
    it('() should set status to waiting', () => {
        const worldState = fromMatrix([
            [0.1],
            [1.1]
        ])
            .setIn(['zombiz', 0, 1, 'y'], 0.1)
            .setIn(['zombiz', 0, 0, 'swipe'], Immutable.Map({
                i: 0,
                j: 1,
                direction: {
                    i: 0,
                    j: -1
                }
            }))
            .setIn(['zombiz', 0, 1, 'swipe'], Immutable.Map({
                i: 0,
                j: 0,
                direction: {
                    i: 0,
                    j: 1
                }
            }));
        const actual = reducer(worldState)
            .getIn(['zombiz', 0, 0, 'status']);
        const expected = Status.Waiting;
        expect(actual).to.equal(expected);
    });
    it('() should clear waiting status', () => {
        const worldState = fromMatrix([
            [0.4],
            [1.1]
        ])
            .setIn(['zombiz', 0, 0, 'swipe'], Immutable.Map({
                i: 0,
                j: 1,
                direction: {
                    i: 0,
                    j: -1
                }
            }))
            .setIn(['zombiz', 0, 1, 'swipe'], Immutable.Map({
                i: 0,
                j: 0,
                direction: {
                    i: 0,
                    j: 1
                }
            }));
        const actual = reducer(worldState)
            .getIn(['zombiz', 0, 1, 'status']);
        const expected = Status.Swapped;
        expect(actual).to.equal(expected);
    });
    it('() should increase score by 1', () => {
        const worldState = fromMatrix([
            [0],
            [0.1]
        ])
            .setIn(['zombiz', 0, 0, 'animation'], 1);
        const actual = reducer(worldState)
            .getIn(['score']);
        const expected = 1;
        expect(actual).to.equal(expected);
    });
    it('() should increase score by 3', () => {
        const worldState = fromMatrix([
            [0.1],
            [0.1],
            [0.1]
        ])
            .setIn(['zombiz', 0, 0, 'animation'], 1)
            .setIn(['zombiz', 0, 1, 'animation'], 1)
            .setIn(['zombiz', 0, 2, 'animation'], 1)
            .setIn(['score'], 1);
        const actual = reducer(worldState)
            .getIn(['score']);
        const expected = 4;
        expect(actual).to.equal(expected);
    });
    it('() should set health to 100', () => {
        const worldState = reducer();
        const actual = worldState.get('health') as number;
        const expected = 100;
        expect(actual).to.equal(expected);
    });
    it('() should damage health over time', () => {
        const worldState1 = reducer();
        const health1 = worldState1.get('health') as number;
        const worldState2 = reducer(worldState1);
        const health2 = worldState2.get('health') as number;
        const actual = health1 > health2;
        const expected = true;
        expect(actual).to.equal(expected);
    });
    it('() should end game', () => {
        const worldState = reducer()
            .set('health', 0.0000001);
        const actual = reducer(worldState)
            .get('gamePhase') as GamePhase;
        const expected = GamePhase.Over;
        expect(actual).to.equal(expected);
    });
});