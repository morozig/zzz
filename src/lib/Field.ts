import * as CSP from './CSPWrapper';
import * as Match3 from './Match3';

const enum TaskAction {
    CreateZombi,
    Move,
    Destroy,
    Remove
}

const enum Colour {
    Blue,
    Brown,
    Green,
    Grey,
    Red,
    White,
    Yellow,
    Chameleon
}

const enum ZombiType {
    Normal,
    Grenade,
    Electric,
    Saw,
    Nuclear
}

interface Position {
    i: number;
    j: number;
}

interface FieldTask extends Position {
    action: TaskAction;
    colour?: number;
    to?: Position;
    zombiType?: ZombiType;
}

interface CompositeTask {
    status: Match3.Status;
    fieldTasks: FieldTask[];
}

interface Swipe extends Position{
    direction: Position;
    revert?: boolean;
}

interface Zombi extends Position{
    colour: Colour;
    status: Match3.Status;
    zombiType: ZombiType;
    create?: {
        zombiType: ZombiType;
    }
    swipe?: Swipe; 
}

interface KillTask {
    groups: Zombi[][];
}

const createZombi = (
        i: number,
        j: number,
        colour: Colour,
        zombiType: ZombiType,
        fieldOutChannel: CSP.Channel
    ) => {
    const status = Match3.Status.Busy;
    const zombi: Zombi = {i, j, colour, status, zombiType};
    const task: FieldTask = {
        i,
        j,
        colour,
        zombiType,
        action: TaskAction.CreateZombi
    };
    fieldOutChannel.put({
        topic: CSP.Topic.FieldTask,
        value: task
    });
    return zombi;
};

const setElectricBomb = (
        fieldOutChannel: CSP.Channel,
        zombiz: Zombi[][]        
    ) => {
    const size = zombiz.length;
    const i = Math.floor(Math.random() * size);
    const j = Math.floor(Math.random() * size);
    const oldZombi = zombiz[i][j];
    if (!oldZombi || oldZombi.status !== Match3.Status.Idle) return;
    const task: FieldTask = {
        i,
        j,
        action: TaskAction.Remove
    };
    fieldOutChannel.put({
        topic: CSP.Topic.FieldTask,
        value: task
    });
    const zombi = createZombi(
        i,
        j,
        Colour.Chameleon,
        ZombiType.Electric,
        fieldOutChannel
    );
    zombi.status = Match3.Status.Idle;
    zombiz[i][j] = zombi;
};

const spawn = (
        fieldOutChannel: CSP.Channel,
        feed: CSP.GenericChannel<Match3.Status>,
        size: number,
        zombiz: Zombi[][]
    ) => {
    const colours = Match3.generateColours(size);
    for (let i = 0; i < size; i++){
        zombiz[i] = [];
        for (let j = 0; j < size; j++){
            const zombi = createZombi(
                i,
                j,
                colours[i][j],
                ZombiType.Normal,
                fieldOutChannel
            );
            zombiz[i][j] = zombi;
            zombi.status = Match3.Status.Idle;
        }
    }
    feed.put(Match3.Status.Idle);
};

const swap = (
        newCompositeTaskChannel: CSP.GenericChannel<CompositeTask>,
        swipe: Swipe,
        zombiz: Zombi[][]
    ) => {
    const zombi = zombiz[swipe.i][swipe.j];
    if (zombi.status != Match3.Status.Idle) return;
    const iTo = zombi.i + swipe.direction.i;
    const jTo = zombi.j + swipe.direction.j;
    if (!zombiz[iTo]) return;
    const zombiTo = zombiz[iTo][jTo];
    if (!zombiTo || zombiTo.status != Match3.Status.Idle) return;
    zombi.status = Match3.Status.Busy;
    zombiTo.status = Match3.Status.Busy;
    zombi.swipe = swipe.revert ? undefined : swipe;
    const temp = {} as Zombi;
    temp.i = zombi.i;
    temp.j = zombi.j;
    zombiz[zombi.i][zombi.j] = zombiTo;
    zombi.i = zombiTo.i;
    zombi.j = zombiTo.j;
    zombiz[zombiTo.i][zombiTo.j] = zombi;
    zombiTo.i = temp.i;
    zombiTo.j = temp.j;
    newCompositeTaskChannel.put({
        fieldTasks: [
            {
                i: zombiTo.i,
                j: zombiTo.j,
                action: TaskAction.Move,
                to: {
                    i: zombi.i,
                    j: zombi.j
                }
            },
            {
                i: zombi.i,
                j: zombi.j,
                action: TaskAction.Move,
                to: {
                    i: zombiTo.i,
                    j: zombiTo.j
                }
            }
        ],
        status: Match3.Status.Idle
    });
};

const tasksManager = (
        newCompositeTaskChannel: CSP.GenericChannel<CompositeTask>,
        doneTaskChannel: CSP.GenericChannel<FieldTask>,
        doneCompositeTaskChannel: CSP.GenericChannel<CompositeTask>,
        fieldOutChannel: CSP.Channel
    ) => {
    interface TasksEntry{
        compositeTask: CompositeTask;
        inProgress: FieldTask[];
    }
    const tasksDB: TasksEntry[] = []; 
    (async () => {
        while (true){
            const newCompositeTask = await newCompositeTaskChannel.take();
            const newTasks = newCompositeTask.fieldTasks;
            const tasksEntry = {
                compositeTask: newCompositeTask,
                inProgress: newTasks.slice()
            };
            tasksDB.push(tasksEntry);
            for (const task of newTasks){
                fieldOutChannel.put({
                    topic: CSP.Topic.FieldTask,
                    value: task
                });
            }
        }
    })();
    (async () => {
        while (true){
            const doneTask = await doneTaskChannel.take();
            const tasksEntry = tasksDB.find((tasksEntry) => 
                tasksEntry.inProgress.includes(doneTask)
            )
            const taskIndex = tasksEntry.inProgress.indexOf(doneTask);
            tasksEntry.inProgress.splice(taskIndex, 1);
            if (tasksEntry.inProgress.length === 0){
                doneCompositeTaskChannel.put(tasksEntry.compositeTask);
                tasksDB.splice(tasksDB.indexOf(tasksEntry), 1);
            }
        }
    })();
};

const pool = (
        doneCompositeTaskChannel: CSP.GenericChannel<CompositeTask>,
        feed: CSP.GenericChannel<Match3.Status>,
        fieldOutChannel: CSP.Channel,
        zombiz: Zombi[][]
    ) => {
    (async () => {
        while (true){
            const doneCompositeTask = await doneCompositeTaskChannel.take();
            switch (doneCompositeTask.status){
                case Match3.Status.Dead: {
                    for(const task of doneCompositeTask.fieldTasks){
                        const zombi = zombiz[task.i][task.j];
                        if (!zombi) break;
                        if (zombi.create){
                            const zombiType = zombi.create.zombiType;
                            const colour = zombiType === ZombiType.Electric ? 
                                Colour.Chameleon : zombi.colour;
                            const newBomb = createZombi(
                                task.i,
                                task.j,
                                colour,
                                zombiType,
                                fieldOutChannel
                            );
                            newBomb.status = Match3.Status.Falling;
                            zombiz[task.i][task.j] = newBomb;
                            feed.put(Match3.Status.Falling);
                        } else zombi.status = Match3.Status.Dead;
                    }
                    feed.put(Match3.Status.Dead);
                    break;
                }
                case Match3.Status.Idle: {
                    for(const task of doneCompositeTask.fieldTasks){
                        const zombi = zombiz[task.to.i][task.to.j];
                        zombi.status = Match3.Status.Idle;
                    }
                    feed.put(Match3.Status.Idle);
                    break;
                }
                case Match3.Status.Falling: {
                    for(const task of doneCompositeTask.fieldTasks){
                        const zombi = zombiz[task.to.i][task.to.j];
                        if (!zombi) break;
                        zombi.status = Match3.Status.Falling;
                    }
                    feed.put(Match3.Status.Falling);
                    break;
                }
            }
        }
    })();
};

const update = (
        feed: CSP.GenericChannel<Match3.Status>,
        newCompositeTaskChannel: CSP.GenericChannel<CompositeTask>,
        killTaskChannel: CSP.GenericChannel<KillTask>,
        fieldOutChannel: CSP.Channel,
        zombiz: Zombi[][]
    ) => {
    (async () => {
        while (true){
            const status = await feed.take();
            switch (status){
                case Match3.Status.Idle: {
                    const swapped: Zombi[] = [];
                    const swapBack: Set<Zombi> = new Set();
                    for (const colomn of zombiz){
                        for (const zombi of colomn){
                            if (zombi && zombi.swipe
                                && zombi.status === Match3.Status.Idle
                                ) swapped.push(zombi);
                        }
                    }
                    const groups = Match3.find(zombiz);
                    if (groups.length > 0){
                        const zombizInGroups = groups.reduce(
                            (prev, cur) => prev.concat(cur)
                        );
                        for (const zombi of swapped){
                            const swappedFrom =
                                zombiz[zombi.swipe.i][zombi.swipe.j];
                            if (zombizInGroups.includes(zombi)
                                || zombizInGroups.includes(swappedFrom)){
                                zombi.swipe = undefined;
                                swappedFrom.swipe = undefined;
                            } else {
                                swapBack.add(zombi);
                            }
                        }
                        for (const zombi of zombizInGroups){
                            zombi.status = Match3.Status.Busy;
                        }
                        const killTask: KillTask = {
                            groups: groups as Zombi[][]
                        };
                        killTaskChannel.put(killTask);
                    } else {
                        for (const zombi of swapped) swapBack.add(zombi);
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
                        swap(newCompositeTaskChannel, revertSwipe, zombiz);
                    }
                    const areAllIdle = zombiz.every((colomn) => colomn.every(
                        (zombi) => zombi && zombi.status === Match3.Status.Idle
                    ));
                    if (areAllIdle && zombiz.length > 2){
                        const hints = Match3.hint(zombiz);
                        if (hints.length === 0){
                            const noElectricBombs = zombiz.every(
                                colomn => colomn.every(
                                    zombi =>
                                        zombi.zombiType !== ZombiType.Electric)
                            );
                            if (noElectricBombs){
                                setElectricBomb(fieldOutChannel, zombiz);
                            }
                        }
                    }
                    break;
                }
                case Match3.Status.Dead: 
                case Match3.Status.Falling: {
                    const indeces = Match3.gravitate(zombiz);
                    if (indeces.toFall.length > 0){
                        const toFall: FieldTask[][] = [];
                        const size = zombiz.length;
                        indeces.toFall.forEach((colomn, i) => {
                            colomn.forEach((interval, j) => {
                                const zombi = (j < size) ? zombiz[i][j] :
                                    createZombi(
                                        i,
                                        j,
                                        Match3.randomColour(size),
                                        ZombiType.Normal,
                                        fieldOutChannel
                                    );
                                zombi.status = Match3.Status.Busy;
                                zombi.j = j - interval;
                                zombiz[i][j - interval] = zombi;
                                const task: FieldTask = {
                                    i: i,
                                    j: j,
                                    action: TaskAction.Move,
                                    to: {
                                        i: i,
                                        j: j - interval
                                    }
                                };
                                toFall[interval] = toFall[interval] || [];
                                toFall[interval].push(task);
                            });
                        });
                        if (toFall.length > 0){
                            toFall.forEach((tasks, interval) => {
                                newCompositeTaskChannel.put({
                                    fieldTasks: tasks,
                                    status: Match3.Status.Falling
                                });
                            });
                        }
                    }
                    if (indeces.toIdle.length > 0){
                        indeces.toIdle.forEach((colomn, i) => {
                            colomn.forEach((isIdle, j) => {
                                zombiz[i][j].status = Match3.Status.Idle;
                            });
                        });
                        feed.put(Match3.Status.Idle);
                    }
                    if (indeces.toNull.length > 0){
                        indeces.toNull.forEach((colomn, i) => {
                            colomn.forEach((isNull, j) => {
                                zombiz[i][j] = null;
                            });
                        });
                    }
                    break;
                }
            }
        }
    })();
};

const kill = (
        newCompositeTaskChannel: CSP.GenericChannel<CompositeTask>,
        killTaskChannel: CSP.GenericChannel<KillTask>,
        bombChannel: CSP.GenericChannel<Zombi>,
        fieldOutChannel: CSP.Channel,
        zombiz: Zombi[][]
    ) => {
    (async () => {
        while (true){
            const killTask = await killTaskChannel.take();
            const groups = killTask.groups;
            if (groups.length > 0){
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
                }
                const fieldTasks = [] as FieldTask[];
                for (const zombi of zombizInGroups){
                    zombi.status = Match3.Status.Busy;
                    if (zombi.zombiType !== ZombiType.Normal){
                        bombChannel.put(zombi);
                    } else {
                        const fieldTask: FieldTask = {
                            i: zombi.i,
                            j: zombi.j,
                            action: TaskAction.Destroy
                        };
                        fieldTasks.push(fieldTask);
                    }
                }
                const compositeTask = {
                    fieldTasks: fieldTasks,
                    status: Match3.Status.Dead
                }
                newCompositeTaskChannel.put(compositeTask);
            }
        }
    })();
    (async () => {
        while (true){
            const bomb = await bombChannel.take();
            if (!bomb || bomb.zombiType === ZombiType.Normal) continue;
            const toShoot: Set<Zombi> = new Set([bomb]);
            switch (bomb.zombiType){
                case ZombiType.Electric: {
                    const colour = (bomb.colour !== Colour.Chameleon) ?
                        bomb.colour : Match3.randomColour(zombiz.length);
                    for (const coloumn of zombiz){
                        for (const zombi of coloumn){
                            if (zombi 
                                && zombi.status === Match3.Status.Idle
                                && zombi.colour === colour){
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
                            if (zombi && zombi.status == Match3.Status.Idle){
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
                        if (zombi && zombi.status == Match3.Status.Idle){
                            toShoot.add(zombi);
                        }
                    }
                    for (let j = 0; j <= size; j++){
                        if (!zombiz[bomb.i]) continue;
                        const zombi = zombiz[bomb.i][j];
                        if (zombi && zombi.status == Match3.Status.Idle){
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
                            if (zombi && zombi.status == Match3.Status.Idle){
                                toShoot.add(zombi);
                            }
                        }
                    }
                    for (let j = -1; j <= 1; j++){
                        for (let i = 0; i <= size; i++){
                            if (!zombiz[i]) continue;
                            const zombi = zombiz[i][bomb.j + j];
                            if (zombi && zombi.status == Match3.Status.Idle){
                                toShoot.add(zombi);
                            }
                        }
                    }
                    break;
                }
            }
            const fieldTasks = [] as FieldTask[];
            for (const zombi of toShoot){
                if (!zombi) continue;
                zombi.status = Match3.Status.Busy;
                if (zombi.zombiType !== ZombiType.Normal && zombi !== bomb){
                    bombChannel.put(zombi);
                } else {
                    const fieldTask: FieldTask = {
                        i: zombi.i,
                        j: zombi.j,
                        action: TaskAction.Destroy
                    };
                    fieldTasks.push(fieldTask);
                }
            }
            const compositeTask = {
                fieldTasks: fieldTasks,
                status: Match3.Status.Dead
            }
            newCompositeTaskChannel.put(compositeTask);
        }
    })();
};

const pipe = (fieldInChannel: CSP.Channel) => {
    const fieldOutChannel = CSP.createChannel();
    const newCompositeTaskChannel = CSP.createGenericChannel<CompositeTask>();
    const doneTaskChannel = CSP.createGenericChannel<FieldTask>();
    const doneCompositeTaskChannel = CSP.createGenericChannel<CompositeTask>();
    const killTaskChannel = CSP.createGenericChannel<KillTask>();
    const bombChannel = CSP.createGenericChannel<Zombi>();
    const feed = CSP.createGenericChannel<Match3.Status>();
    let size = 0;
    const zombiz: Zombi[][] = [];
    tasksManager(
        newCompositeTaskChannel,
        doneTaskChannel,
        doneCompositeTaskChannel, 
        fieldOutChannel
    );
    pool(doneCompositeTaskChannel, feed, fieldOutChannel, zombiz);
    update(
        feed,
        newCompositeTaskChannel,
        killTaskChannel,
        fieldOutChannel,
        zombiz
    );
    kill(newCompositeTaskChannel,
        killTaskChannel,
        bombChannel,
        fieldOutChannel,
        zombiz
    );
    (async () => {
        while (true){
            const message = await fieldInChannel.take();
            if (message === CSP.DONE){
                fieldOutChannel.close();
                break;
            }
            switch (message.topic) {
                case CSP.Topic.GameSize: {
                    size = message.value
                    spawn(fieldOutChannel, feed, size, zombiz);
                    break;
                }
                case CSP.Topic.Swipe: {
                    const swipe: Swipe = message.value;
                    const zombi = zombiz[swipe.i][swipe.j];
                    if (!zombi) break;
                    if (zombi.zombiType === ZombiType.Electric){
                        if (zombi.status != Match3.Status.Idle) break;
                        const iTo = zombi.i + swipe.direction.i;
                        const jTo = zombi.j + swipe.direction.j;
                        if (!zombiz[iTo]) break;
                        const zombiTo = zombiz[iTo][jTo];
                        if (!zombiTo ||
                            zombiTo.status != Match3.Status.Idle) break;
                        zombi.status = Match3.Status.Busy;
                        zombi.colour = zombiTo.colour;
                        bombChannel.put(zombi);
                    } else {
                        swap(newCompositeTaskChannel, message.value, zombiz);
                    }
                    break;
                }
                case CSP.Topic.FieldTaskDone: {
                    const task = message.value as FieldTask;
                    doneTaskChannel.put(task);
                    break;
                }
            }
        }
    })();
    return fieldOutChannel;
};

export {
    pipe,
    TaskAction,
    FieldTask,
    Swipe,
    Zombi,
    ZombiType
};