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

const enum BombType {
    Electric
}

interface Position {
    i: number;
    j: number;
}

interface FieldTask extends Position {
    action: TaskAction;
    colour?: number;
    to?: Position;
}

interface CompositeTask {
    status: Match3.Status;
    fieldTasks: FieldTask[];
}

interface Swipe extends Position{
    direction: Position;
}

interface Bomb {
    type: BombType;
    create?: boolean;
}

interface Zombi extends Position{
    colour: Colour;
    status: Match3.Status;
    bomb?: Bomb;
}

interface KillTask {
    groups: Zombi[][];
    bombs: Zombi[];
}

const createZombi = (
        i: number,
        j: number,
        colour: Colour,
        fieldOutChannel: CSP.Channel
    ) => {
    const status = Match3.Status.Busy;
    const zombi: Zombi = {i, j, colour, status};
    const task: FieldTask = {
        i,
        j,
        colour,
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
    const task: FieldTask = {
        i,
        j,
        action: TaskAction.Remove
    };
    fieldOutChannel.put({
        topic: CSP.Topic.FieldTask,
        value: task
    });
    const zombi = createZombi(i, j, Colour.Chameleon, fieldOutChannel);
    zombi.status = Match3.Status.Idle;
    zombi.bomb = {type: BombType.Electric};
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
            const zombi = createZombi(i, j, colours[i][j], fieldOutChannel);
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
                        if (zombi.bomb && zombi.bomb.create){
                            const newBomb = createZombi(
                                task.i,
                                task.j,
                                Colour.Chameleon,
                                fieldOutChannel
                            );
                            newBomb.status = Match3.Status.Falling;
                            newBomb.bomb = {type: BombType.Electric};
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
                    const groups = Match3.find(zombiz);
                    if (groups.length > 0){
                        const zombizInGroups = groups.reduce(
                            (prev, cur) => prev.concat(cur)
                        );
                        for (const zombi of zombizInGroups){
                            zombi.status = Match3.Status.Busy;
                        }
                        const killTask: KillTask = {
                            groups: groups as Zombi[][],
                            bombs: []
                        };
                        killTaskChannel.put(killTask);
                    }
                    const areAllIdle = zombiz.every((colomn) => colomn.every(
                        (zombi) => zombi.status === Match3.Status.Idle
                    ));
                    if (areAllIdle){
                        const hints = Match3.hint(zombiz);
                        if (hints.length === 0){
                            setElectricBomb(fieldOutChannel, zombiz);
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
        zombiz: Zombi[][]
    ) => {
    (async () => {
        while (true){
            const killTask = await killTaskChannel.take();
            const groups = killTask.groups;
            const bombs = killTask.bombs;
            if (groups.length > 0){
                const zombizInGroups: Zombi[] = [];
                for (const group of groups){
                    let longestLine: Zombi[] = [];
                    const verticalLines: Zombi[][] = [];
                    const horizontalLines: Zombi[][] = [];
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
                    if (longestLine.length >= 5){
                        const newBomb = longestLine[2];
                        newBomb.bomb = {
                            type: BombType.Electric,
                            create: true
                        };
                    }
                }
                const fieldTasks = [] as FieldTask[];
                for (const zombi of zombizInGroups){
                    zombi.status = Match3.Status.Busy;
                    const fieldTask: FieldTask = {
                        i: zombi.i,
                        j: zombi.j,
                        action: TaskAction.Destroy
                    };
                    fieldTasks.push(fieldTask);
                }
                const compositeTask = {
                    fieldTasks: fieldTasks,
                    status: Match3.Status.Dead
                }
                newCompositeTaskChannel.put(compositeTask);
            }
            if (bombs.length > 0){
                for (const zombi of bombs){
                    if (zombi.bomb.type === BombType.Electric){
                        const colour = zombi.colour;
                        const zombizOfColour = [zombi];
                        for (const coloumn of zombiz){
                            for (const zombi of coloumn){
                                if (zombi.colour === colour 
                                    && zombi.status === Match3.Status.Idle){
                                    zombizOfColour.push(zombi);
                                }
                            }
                        }
                        const fieldTasks = [] as FieldTask[];
                        for (const zombi of zombizOfColour){
                            zombi.status = Match3.Status.Busy;
                            const fieldTask: FieldTask = {
                                i: zombi.i,
                                j: zombi.j,
                                action: TaskAction.Destroy
                            };
                            fieldTasks.push(fieldTask);
                        }
                        const compositeTask = {
                            fieldTasks: fieldTasks,
                            status: Match3.Status.Dead
                        }
                        newCompositeTaskChannel.put(compositeTask);
                    }
                }
            }
        }
    })();
};

const pipe = (fieldInChannel: CSP.Channel) => {
    const fieldOutChannel = CSP.createChannel();
    const newCompositeTaskChannel = CSP.createGenericChannel<CompositeTask>();
    const doneTaskChannel = CSP.createGenericChannel<FieldTask>();
    const doneCompositeTaskChannel = CSP.createGenericChannel<CompositeTask>();
    const killTaskChannel = CSP.createGenericChannel<KillTask>();
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
    kill(newCompositeTaskChannel, killTaskChannel, zombiz);
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
                    if (zombi.bomb){
                        if (zombi.status != Match3.Status.Idle) break;
                        const iTo = zombi.i + swipe.direction.i;
                        const jTo = zombi.j + swipe.direction.j;
                        if (!zombiz[iTo]) break;
                        const zombiTo = zombiz[iTo][jTo];
                        if (!zombiTo ||
                            zombiTo.status != Match3.Status.Idle) break;
                        zombi.status = Match3.Status.Busy;
                        zombi.colour = zombiTo.colour;
                        const killTask: KillTask = {
                            bombs: [zombi],
                            groups: []
                        };
                        killTaskChannel.put(killTask);
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
    Zombi
};