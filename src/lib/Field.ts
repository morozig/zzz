import * as CSP from './CSPWrapper';

const enum TaskAction {
    CreateZombi,
    Move
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

const enum Status {
    Idle,
    Busy
}

interface Position {
    i: number;
    j: number;
}

interface Task extends Position {
    action: TaskAction;
    additional?: {
        colour?: number,
        to?: Position
    }
}

interface Swipe extends Position{
    direction: Position;
}

interface Zombi extends Position{
    colour: Colour,
    status: Status
}

const randomInt = (range: number) => Math.floor(Math.random() * range);

const create = (channel: CSP.Channel, size: number, zombiz: Zombi[][]) => {
    for (let i = 0; i < size; i++){
        zombiz[i] = [];
        for (let j = 0; j < size; j++){
            const maxColours = Math.min(size - 1, 7);
            const colour = randomInt(maxColours);
            const zombi = {i, j, colour} as Zombi;
            zombiz[i][j] = zombi;
            zombi.status = Status.Idle;
            const task: Task = {
                i: i,
                j: j,
                action: TaskAction.CreateZombi,
                additional: {colour}
            };
            channel.put({
                topic: CSP.Topic.FieldTask,
                value: task
            });
        }
    }
};

const swap = (channel: CSP.Channel, swipe: Swipe, zombiz: Zombi[][]) => {
    const zombi = zombiz[swipe.i][swipe.j];
    if (zombi.status != Status.Idle) return;
    const iTo = zombi.i + swipe.direction.i;
    const jTo = zombi.j + swipe.direction.j;
    if (!zombiz[iTo]) return;
    const zombiTo = zombiz[iTo][jTo];
    if (!zombiTo || zombiTo.status != Status.Idle) return;
    zombi.status = Status.Busy;
    zombiTo.status = Status.Busy;
    const temp = {} as Zombi;
    temp.i = zombi.i;
    temp.j = zombi.j;
    zombiz[zombi.i][zombi.j] = zombiTo;
    zombi.i = zombiTo.i;
    zombi.j = zombiTo.j;
    zombiz[zombiTo.i][zombiTo.j] = zombi;
    zombiTo.i = temp.i;
    zombiTo.j = temp.j;
    channel.put({
        topic: CSP.Topic.FieldTask,
        value: {
            i: zombi.i,
            j: zombi.j,
            action: TaskAction.Move,
            additional: {
                to: zombiTo
            }
        }
    });
    channel.put({
        topic: CSP.Topic.FieldTask,
        value: {
            i: zombiTo.i,
            j: zombiTo.j,
            action: TaskAction.Move,
            additional: {
                to: zombi
            }
        }
    });
};

const pipe = (fieldInChannel: CSP.Channel) => {
    const fieldOutChannel = CSP.createChannel();
    let size = 0;
    const zombiz: Zombi[][] = [];
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
                    create(fieldOutChannel, size, zombiz);
                    break;
                }
                case CSP.Topic.Swipe: {
                    swap(fieldOutChannel, message.value, zombiz);
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
    Swipe
};