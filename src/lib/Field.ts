import * as CSP from './CSPWrapper';
import * as Match3 from './Match3';

const enum TaskAction {
    CreateZombi,
    Move,
    Destroy
}

const enum Colour {
    Blue,
    Brown,
    Green,
    Grey,
    Red,
    White,
    Yellow
}

interface Position {
    i: number;
    j: number;
}

interface Task extends Position {
    action: TaskAction;
    colour?: number;
    to?: Position;
}

interface CompositeTask {
    status: Match3.Status;
    tasks: Task[];
}

interface Swipe extends Position{
    direction: Position;
}

interface Zombi extends Position{
    colour: Colour;
    status: Match3.Status;
}

const createZombi = (
        i: number,
        j: number,
        colour: Colour,
        fieldOutChannel: CSP.Channel
    ) => {
    const status = Match3.Status.Busy;
    const zombi: Zombi = {i, j, colour, status};
    const task: Task = {
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
        tasks: [
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
        doneTaskChannel: CSP.GenericChannel<Task>,
        doneCompositeTaskChannel: CSP.GenericChannel<CompositeTask>,
        fieldOutChannel: CSP.Channel
    ) => {
    interface TasksEntry{
        compositeTask: CompositeTask;
        inProgress: Task[];
    }
    const tasksDB: TasksEntry[] = []; 
    (async () => {
        while (true){
            const newCompositeTask = await newCompositeTaskChannel.take();
            const newTasks = newCompositeTask.tasks;
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
        zombiz: Zombi[][]
    ) => {
    (async () => {
        while (true){
            const doneCompositeTask = await doneCompositeTaskChannel.take();
            switch (doneCompositeTask.status){
                case Match3.Status.Dead: {
                    for(const task of doneCompositeTask.tasks){
                        const zombi = zombiz[task.i][task.j];
                        zombi.status = Match3.Status.Dead;
                    }
                    feed.put(Match3.Status.Dead);
                    break;
                }
                case Match3.Status.Idle: {
                    for(const task of doneCompositeTask.tasks){
                        const zombi = zombiz[task.to.i][task.to.j];
                        zombi.status = Match3.Status.Idle;
                    }
                    feed.put(Match3.Status.Idle);
                    break;
                }
                case Match3.Status.Falling: {
                    for(const task of doneCompositeTask.tasks){
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
                        const tasks = [] as Task[];
                        const zombizInGroups = groups.reduce(
                            (prev, cur) => prev.concat(cur)
                        );
                        for (const element of zombizInGroups){
                            const zombi = element as Zombi;
                            zombi.status = Match3.Status.Busy;
                            const task: Task = {
                                i: zombi.i,
                                j: zombi.j,
                                action: TaskAction.Destroy
                            };
                            tasks.push(task);
                        }
                        const compositeTask = {
                            tasks: tasks,
                            status: Match3.Status.Dead
                        }
                        newCompositeTaskChannel.put(compositeTask);
                    }
                    break;
                }
                case Match3.Status.Dead: 
                case Match3.Status.Falling: {
                    const indeces = Match3.gravitate(zombiz);
                    if (indeces.toFall.length > 0){
                        const toFall: Task[][] = [];
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
                                const task: Task = {
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
                                    tasks: tasks,
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

const pipe = (fieldInChannel: CSP.Channel) => {
    const fieldOutChannel = CSP.createChannel();
    const newCompositeTaskChannel = CSP.createGenericChannel<CompositeTask>();
    const doneTaskChannel = CSP.createGenericChannel<Task>();
    const doneCompositeTaskChannel = CSP.createGenericChannel<CompositeTask>();
    const feed = CSP.createGenericChannel<Match3.Status>();
    let size = 0;
    const zombiz: Zombi[][] = [];
    tasksManager(
        newCompositeTaskChannel,
        doneTaskChannel,
        doneCompositeTaskChannel, 
        fieldOutChannel
    );
    pool(doneCompositeTaskChannel, feed, zombiz);
    update(feed, newCompositeTaskChannel, fieldOutChannel, zombiz);
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
                    swap(newCompositeTaskChannel, message.value, zombiz);
                    break;
                }
                case CSP.Topic.FieldTaskDone: {
                    const task = message.value as Task;
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
    Task,
    Swipe,
    Zombi
};