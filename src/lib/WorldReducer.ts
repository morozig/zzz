import Immutable from 'immutable';
import * as Match3 from './Match3';

const MAX_COLORS = 7;
const TILES_PER_SECOND = 12;
const ANIMATION_PER_SECOND = 12;
const DAMAGE_PER_SECOND = 100 / 60;
// const TILES_PER_SECOND = 0.1;

const enum Status {
    Idle,
    Busy,
    Falling,
    Dead,
    Waiting,
    Swapped
}

const enum ZombiType {
    Normal,
    Grenade,
    Electric,
    Saw,
    Nuclear
}

const enum Color {
    Blue,
    Brown,
    Green,
    Grey,
    Red,
    White,
    Yellow,
    Chameleon
}

const enum GamePhase {
    Active,
    Final,
    Over
}

interface Zombi {
    id: number;
    i: number;
    j: number;
    x: number;
    y: number;
    color: number;
    status: Status;
    zombiType: ZombiType;
    animation?: number;
    create?: {
        zombiType: ZombiType;
    }
    swipe?: Swipe;
}

type ZombiKeys =
    'id' |
    'i' |
    'j' |
    'x' |
    'y' |
    'color' |
    'status' |
    'animation' |
    'swipe' |
    'zombiType';

type ZombiMap = Immutable.Map<ZombiKeys, number>;

type WorldStateKeys =
    'zombiz' |
    'score' |
    'count' |
    'health' |
    'gamePhase';

type ZombizMap = Immutable.List<
        Immutable.List<ZombiMap>
    >;

type WorldStateValues =
    ZombizMap |
    number |
    GamePhase;

type WorldState = Immutable.Map<
    WorldStateKeys,
    WorldStateValues
>;

interface Direction{
    i: number
    j: number
};

interface Position{
    i: number
    j: number
};

interface Swipe extends Position{
    direction: Position;
    revert?: boolean;
}

interface WorldAction{
    type: 'swipe';
    value: {
        position: Position;
        direction: Direction;
    }
};

const spawn = (size: number) => {
    const colors = Match3.generateColors(size);
    const zombiz: Zombi[][] = [];
    for (let i = 0; i < size; i++){
        zombiz[i] = [];
        for (let j = 0; j < size; j++){
            const zombi = createZombi(i, j, size);
            zombi.color = colors[i][j];
            zombi.status = Status.Idle;
            zombiz[i][j] = zombi;
        }
    }
    return zombiz;
};

const createZombi = (i: number, j: number, size: number) => {
    return {
        i,
        j,
        id: (Date.now() % 120000) * 100 + i * size + j,
        color: Match3.randomColor(size),
        x: i / size,
        y: j / size,
        status: Status.Falling,
        zombiType: ZombiType.Normal
    } as Zombi;
};

const swap = (worldState: WorldState, action: WorldAction) => {
    const swipe: Swipe = {
        i: action.value.position.i,
        j: action.value.position.j,
        direction: action.value.direction
    };
    const zombi: ZombiMap = worldState.getIn([
        'zombiz',
        swipe.i,
        swipe.j
    ]);
    if (!zombi) return worldState;
    if (zombi.get('status') != Status.Idle) return worldState;
    const iFrom = swipe.i;
    const jFrom = swipe.j;
    const iTo = iFrom + swipe.direction.i;
    const jTo = jFrom + swipe.direction.j;
    if (iTo < 0 || jTo < 0) return worldState;
    if (!(worldState.get('zombiz') as ZombizMap).has(iTo)) return worldState;
    if (!worldState.getIn(['zombiz', iTo]).has(jTo)) return worldState;
    const zombiTo: ZombiMap = worldState.getIn([
        'zombiz',
        iTo,
        jTo
    ]);
    if (!zombiTo || zombiTo.get('status') != Status.Idle) return worldState;
    return worldState.withMutations((mutableState) => {
        if (zombi.get('zombiType') === ZombiType.Electric){
            const bomb: Zombi = zombi.toJS();
            bomb.color = zombiTo.get('color');
            sideEffectExplode(mutableState, bomb);
        } else {
            sideEffectSwap(mutableState, swipe);
        }
    });
};

const sideEffectSwap = (mutableState: WorldState, swipe: Swipe) => {
    const zombiz: Zombi[][] = (mutableState.get('zombiz') as ZombizMap).toJS();
    const zombi = zombiz[swipe.i][swipe.j];
    const iTo = zombi.i + swipe.direction.i;
    const jTo = zombi.j + swipe.direction.j;
    const zombiTo = zombiz[iTo][jTo];
    // if (zombi.status === Status.Busy ||
    //     zombiTo.status === Status.Busy) return;
    zombi.status = Status.Busy;
    zombiTo.status = Status.Busy;
    const revertSwipe: Swipe = {
        i: iTo,
        j: jTo,
        direction: {
            i: swipe.direction.i * -1,
            j: swipe.direction.j * -1
        },
        revert: swipe.revert
    };
    zombi.swipe = swipe;
    zombiTo.swipe = revertSwipe;
    const temp = {
        i: zombi.i,
        j: zombi.j
    };
    zombi.i = zombiTo.i;
    zombi.j = zombiTo.j;
    zombiTo.i = temp.i;
    zombiTo.j = temp.j;
    mutableState.setIn([
        'zombiz',
        zombi.i,
        zombi.j
    ], Immutable.Map(zombi));
    mutableState.setIn([
        'zombiz',
        zombiTo.i,
        zombiTo.j
    ], Immutable.Map(zombiTo));
};

const sideEffectTime = (mutableState: WorldState) => {
    const iSize = (mutableState.get('zombiz') as ZombizMap).size;
    const jSize = mutableState.getIn(['zombiz', 0]).size;
    const xSpeed = TILES_PER_SECOND / 60 / iSize;
    const ySpeed = TILES_PER_SECOND / 60 / jSize;
    const busyZombiz: Zombi[] = (mutableState
        .get('zombiz') as ZombizMap)
        .flatten(true)
        .filter(zombi => zombi)
        .filter(zombi => zombi.get('status') == Status.Busy)
        .map(zombi => zombi.toJS())
        .toArray();
    sideEffectGravitate(mutableState);
    sideEffectCheck(mutableState);
    sideEffectHint(mutableState);
    for (const zombi of busyZombiz){
        const targetX = zombi.i / iSize;
        const targetY = zombi.j / jSize;
        let newX: number;
        let newY: number;
        let newAnimation: number;
        if (Math.abs(targetX - zombi.x) > xSpeed){
            newX = zombi.x + Math.sign(targetX - zombi.x) * xSpeed;
        } else if (Math.abs(targetX - zombi.x) > 0){
            newX = targetX;
        }
        if (Math.abs(targetY - zombi.y) > ySpeed){
            newY = zombi.y + Math.sign(targetY - zombi.y) * ySpeed;
        } else if (Math.abs(targetY - zombi.y) > 0){
            newY = targetY;
        }
        if (newX !== undefined){
            mutableState.setIn([
                'zombiz',
                zombi.i,
                zombi.j,
                'x'
            ], newX);
        }
        if (newY !== undefined){
            mutableState.setIn([
                'zombiz',
                zombi.i,
                zombi.j,
                'y'
            ], newY);
        }
        if (zombi.animation !== undefined){
            const animationSpeed = ANIMATION_PER_SECOND / 60;
            if ((1 - zombi.animation) > animationSpeed){
                newAnimation = zombi.animation + animationSpeed;
            } else if ((1 - zombi.animation) > 0){
                newAnimation = 1;
            }
            if (zombi.zombiType !== ZombiType.Normal &&
                zombi.animation === 0){
                sideEffectExplode(mutableState, zombi);
            }
        }
        if (newAnimation !== undefined){
            mutableState.setIn([
                'zombiz',
                zombi.i,
                zombi.j,
                'animation'
            ], newAnimation);
        }
        if (((newX !== undefined ? newX : zombi.x) === targetX) &&
            ((newY !== undefined ? newY : zombi.y) === targetY) &&
            (zombi.animation === undefined)){
            let newStatus = Status.Falling;
            if (zombi.swipe){
                const swappedFrom: Zombi = mutableState.getIn([
                    'zombiz',
                    zombi.swipe.i,
                    zombi.swipe.j
                ]).toJS();
                if (swappedFrom.swipe && swappedFrom.status === Status.Busy){
                    newStatus = Status.Waiting;
                } else if (swappedFrom.status === Status.Waiting){
                    if (zombi.swipe.revert){
                        newStatus = Status.Falling;
                        mutableState.setIn([
                            'zombiz',
                            zombi.swipe.i,
                            zombi.swipe.j,
                            'status'
                        ], Status.Falling);
                        mutableState.setIn([
                            'zombiz',
                            zombi.i,
                            zombi.j,
                            'swipe'
                        ], undefined);
                        mutableState.setIn([
                            'zombiz',
                            zombi.swipe.i,
                            zombi.swipe.j,
                            'swipe'
                        ], undefined);
                    }
                    else {
                        newStatus = Status.Swapped;
                        mutableState.setIn([
                            'zombiz',
                            zombi.swipe.i,
                            zombi.swipe.j,
                            'status'
                        ], Status.Swapped);
                    }
                }
            }
            mutableState.setIn([
                'zombiz',
                zombi.i,
                zombi.j,
                'status'
            ], newStatus);
        }
        if (newAnimation === 1 || zombi.animation === 1){
            if (zombi.create){
                const zombiType = zombi.create.zombiType;
                const color = zombiType === ZombiType.Electric ? 
                    Color.Chameleon : zombi.color;
                const newBomb = createZombi(
                    zombi.i,
                    zombi.j,
                    iSize
                );
                newBomb.status = Status.Falling;
                newBomb.color = color;
                newBomb.zombiType = zombiType;
                mutableState.setIn([
                    'zombiz',
                    zombi.i,
                    zombi.j
                ], Immutable.Map(newBomb));
            } else {
                mutableState.setIn([
                    'zombiz',
                    zombi.i,
                    zombi.j,
                    'status'
                ], Status.Dead);
            }
            mutableState.update(
                'score',
                score => score as number + 1
            );
        }
    }
};

const sideEffectExplode = (mutableState: WorldState, bomb: Zombi) => {
    const zombiz: Zombi[][] = (mutableState.get('zombiz') as ZombizMap).toJS();
    const toShoot: Set<Zombi> = new Set([bomb]);
    switch (bomb.zombiType){
        case ZombiType.Electric: {
            const color = (bomb.color !== Color.Chameleon) ?
                bomb.color : Match3.randomColor(zombiz.length);
            for (const coloumn of zombiz){
                for (const zombi of coloumn){
                    if (zombi &&
                        zombi.status === Status.Idle &&
                        zombi.color === color){
                        toShoot.add(zombi);
                    }
                }
            }
            break;
        }
        case ZombiType.Grenade: {
            for (let i = -1; i <= 1; i++){
                for (let j = -1; j <= 1; j++){
                    if (!zombiz[bomb.i + i]) continue;
                    const zombi = zombiz[bomb.i + i][bomb.j + j];
                    if (zombi && zombi.status == Status.Idle){
                        toShoot.add(zombi);
                    }
                }
            }
            break;
        }
        case ZombiType.Saw:{
            const size = zombiz.length;
            for (let i = 0; i <= size; i++){
                if (!zombiz[i]) continue;
                const zombi = zombiz[i][bomb.j];
                if (zombi && zombi.status == Status.Idle){
                    toShoot.add(zombi);
                }
            }
            for (let j = 0; j <= size; j++){
                if (!zombiz[bomb.i]) continue;
                const zombi = zombiz[bomb.i][j];
                if (zombi && zombi.status == Status.Idle){
                    toShoot.add(zombi);
                }
            }
            break;
        }
        case ZombiType.Nuclear: {
            const size = zombiz.length;
            for (let i = -1; i <= 1; i++){
                if (!zombiz[bomb.i + i]) continue;
                for (let j = 0; j <= size; j++){
                    const zombi = zombiz[bomb.i + i][j];
                    if (zombi && zombi.status == Status.Idle){
                        toShoot.add(zombi);
                    }
                }
            }
            for (let j = -1; j <= 1; j++){
                for (let i = 0; i <= size; i++){
                    if (!zombiz[i]) continue;
                    const zombi = zombiz[i][bomb.j + j];
                    if (zombi && zombi.status == Status.Idle){
                        toShoot.add(zombi);
                    }
                }
            }
            break;
        }
    }
    for (const zombi of toShoot){
        if (!zombi) continue;
        mutableState.setIn([
            'zombiz',
            zombi.i,
            zombi.j,
            'status'
        ], Status.Busy);
        mutableState.setIn([
            'zombiz',
            zombi.i,
            zombi.j,
            'animation'
        ], 0);
    }
};

const sideEffectCheck = (mutableState: WorldState) => {
    const zombiz: Zombi[][] = (mutableState.get('zombiz') as ZombizMap).toJS();
    const swapped = [] as Zombi[];
    const swapBack: Set<Zombi> = new Set();
    for (const colomn of zombiz){
        for (const zombi of colomn){
            if (zombi && zombi.swipe && zombi.status === Status.Swapped){
                swapped.push(zombi);
                zombi.status = Status.Idle;
            }
        }
    }
    const groups: Zombi[][] = Match3.find(zombiz) as any;
    const zombizInGroups: Zombi[] = [];
    for (const group of groups){
        let longestLine: Zombi[] = [];
        const verticalLines: Zombi[][] = [];
        const horizontalLines: Zombi[][] = [];
        let newBomb: Zombi;
        for (const zombi of group){
            zombizInGroups.push(zombi);
            verticalLines[zombi.i] = verticalLines[zombi.i] || [];
            verticalLines[zombi.i].push(zombi);
            const verticalLine = verticalLines[zombi.i];
            if (verticalLine.length > longestLine.length){
                longestLine = verticalLine;
            }
            horizontalLines[zombi.j] = 
                horizontalLines[zombi.j] || [];
            horizontalLines[zombi.j].push(zombi);
            const horizontalLine = horizontalLines[zombi.j];
            if (horizontalLine.length > longestLine.length){
                longestLine = horizontalLine;
            }
        }
        const otherZombi = group.find((zombi) => 
            !longestLine.includes(zombi)
        );
        if (otherZombi){
            newBomb = longestLine.find((zombi) => 
                zombi.i === otherZombi.i ||
                zombi.j === otherZombi.j
            );
            newBomb = newBomb || longestLine[0];
            if (longestLine.length >= 4){
                newBomb.create = {
                    zombiType: ZombiType.Nuclear
                };
            } else {
                newBomb.create = {
                    zombiType: ZombiType.Saw
                };
            }
        } else {
            if (longestLine.length >= 5){
                newBomb = longestLine[2];
                newBomb.create = {
                    zombiType: ZombiType.Electric
                };
            } else if (longestLine.length === 4){
                newBomb = longestLine[1];
                newBomb.create = {
                    zombiType: ZombiType.Grenade
                };
            }
        }
        if (newBomb){
            mutableState.setIn([
                'zombiz',
                newBomb.i,
                newBomb.j,
                'create'
            ], Immutable.Map(newBomb.create));
        }
    }
    for (const element of zombizInGroups){
        const zombi: Zombi  = element as any;
        mutableState.setIn([
            'zombiz',
            zombi.i,
            zombi.j,
            'status'
        ], Status.Busy);
        mutableState.setIn([
            'zombiz',
            zombi.i,
            zombi.j,
            'animation'
        ], 0);
    }
    for (const zombi of swapped){
        const swappedFrom = zombiz[zombi.swipe.i][zombi.swipe.j];
        if (zombizInGroups.includes(zombi)){
            mutableState.setIn([
                'zombiz',
                zombi.i,
                zombi.j,
                'swipe'
            ], undefined);
        } else {
            if (zombizInGroups.includes(swappedFrom)){
                mutableState.setIn([
                    'zombiz',
                    zombi.i,
                    zombi.j,
                    'swipe'
                ], undefined);
                mutableState.setIn([
                    'zombiz',
                    zombi.i,
                    zombi.j,
                    'status'
                ], Status.Falling);
            } else {
                 if (!swapBack.has(swappedFrom)) swapBack.add(zombi);
            }
        }
    }
    for (const zombi of swapBack){
        const swipe = zombi.swipe;
        const revertSwipe: Swipe = {
            i: zombi.i,
            j: zombi.j,
            direction: {
                i: swipe.direction.i * -1,
                j: swipe.direction.j * -1
            },
            revert: true
        };
        sideEffectSwap(mutableState, revertSwipe);
    }
};

const sideEffectGravitate = (mutableState: WorldState) => {
    const zombiz: Zombi[][] = (mutableState.get('zombiz') as ZombizMap).toJS();
    const indeces = Match3.gravitate(zombiz);
    if (indeces.toFall.length > 0){
        const size = zombiz.length;
        indeces.toFall.forEach((colomn, i) => {
            colomn.forEach((interval, j) => {
                const zombi = (j < size) ? zombiz[i][j] :
                    createZombi(i, j, size);
                zombi.status = Status.Busy;
                zombi.j = j - interval;
                mutableState.setIn([
                    'zombiz',
                    i,
                    j - interval
                ], Immutable.Map(zombi));
            });
        });
    }
    if (indeces.toIdle.length > 0){
        indeces.toIdle.forEach((colomn, i) => {
            colomn.forEach((isIdle, j) => {
                mutableState.setIn([
                    'zombiz',
                    i,
                    j,
                    'status'
                ], Status.Idle);
            });
        });
    }
    if (indeces.toNull.length > 0){
        indeces.toNull.forEach((colomn, i) => {
            colomn.forEach((isNull, j) => {
                mutableState.setIn([
                    'zombiz',
                    i,
                    j
                ], null);
            });
        });
    }
};

const sideEffectHint = (mutableState: WorldState) => {
    const areAllIdle = (mutableState
        .get('zombiz') as ZombizMap)
        .flatten(true)
        .every(zombi => zombi && zombi.get('status') === Status.Idle);
    if (!areAllIdle) return;
    const zombiz: Zombi[][] = (mutableState.get('zombiz') as ZombizMap).toJS();
    const hints = Match3.hint(zombiz);
    if (hints.length === 0){
        const noElectricBombs = zombiz.every(
            colomn => colomn.every(
                zombi => zombi.zombiType !== ZombiType.Electric
            )
        );
        if (noElectricBombs){
            const size = zombiz.length;
            const i = Math.floor(Math.random() * size);
            const j = Math.floor(Math.random() * size);
            const zombi = createZombi(i, j, size);
            zombi.status = Status.Idle;
            zombi.zombiType = ZombiType.Electric;
            zombi.color = Color.Chameleon;
            mutableState.setIn([
                'zombiz',
                i,
                j
            ], Immutable.Map(zombi));
        }
    }
};

const sideEffectTriggerSomeBomb = (
    mutableState: WorldState,
    bombs: Zombi[]
    ) => {
    const zombiz: Zombi[][] = (mutableState.get('zombiz') as ZombizMap).toJS();
    const zombi = bombs[Math.floor(Math.random() * bombs.length)];
    mutableState.setIn([
        'zombiz',
        zombi.i,
        zombi.j,
        'status'
    ], Status.Busy);
    mutableState.setIn([
        'zombiz',
        zombi.i,
        zombi.j,
        'animation'
    ], 0);
};

const time = (worldState: WorldState) => {
    let currentState = worldState;
    let gamePhase = worldState.get('gamePhase') as GamePhase;
    if (gamePhase === GamePhase.Active){
        const health = worldState.get('health') as number;
        const damagedHealth = health - DAMAGE_PER_SECOND / 60;
        if (damagedHealth <= 0){
            currentState = worldState
                .set('health', 0)
                .set('gamePhase', GamePhase.Final);
            gamePhase = GamePhase.Final;
        } else {
            currentState = worldState.set('health', damagedHealth);
        }
    }
    const needUpdate = (currentState
        .get('zombiz') as ZombizMap)
        .flatten(true)
        .some(zombi => zombi && zombi.get('status') !== Status.Idle);
    if (gamePhase === GamePhase.Final){
        if (!needUpdate){
            const bombs = (currentState
                .get('zombiz') as ZombizMap)
                .flatten(true)
                .filter(zombi => zombi)
                .filter(zombi => zombi.get('zombiType') !== ZombiType.Normal)
                .map(zombi => zombi.toJS())
                .toArray();
            if (bombs.length > 0) {
                currentState = currentState.withMutations(mutableState => {
                    sideEffectTriggerSomeBomb(mutableState, bombs);
                });
            } else {
                return currentState
                    .set('gamePhase', GamePhase.Over);
            }
        }
    }
    return needUpdate ? currentState.withMutations(mutableState => {
        sideEffectTime(mutableState);
    }) : currentState;
};

const reducer = (
        worldState?: WorldState,
        action?: WorldAction
    ) => {
    if (!worldState){
        const zombiz = spawn(8);
        const score = 0;
        const health = 100;
        const gamePhase = GamePhase.Active;
        return Immutable.fromJS(
            {
                zombiz,
                score,
                health,
                gamePhase
            }
        ) as WorldState;
    } else {
        if (action) {
            const gamePhase = worldState.get('gamePhase') as GamePhase;
            return (gamePhase === GamePhase.Active) ? 
                swap(worldState, action) : 
                worldState;
        }
        else return time(worldState);
    };
};

export {
    reducer,
    Zombi,
    WorldState,
    WorldAction,
    Status,
    TILES_PER_SECOND,
    ANIMATION_PER_SECOND,
    ZombiKeys,
    ZombiType,
    Swipe,
    ZombizMap,
    GamePhase
}