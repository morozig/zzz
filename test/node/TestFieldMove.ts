import { expect } from 'chai';
import * as Field from '../../src/lib/Field';
import * as CSP from '../../src/lib/CSPWrapper';

// const describe = (message: string, test: () => void) => {test()};
// const it = (message: string, test: () => void) => {test()};

const startSwipes = async (size: number, swipes: Field.Swipe[]) => {
    const fieldInChannel = CSP.createChannel();
    const fieldOutChannel = Field.pipe(fieldInChannel);
    fieldInChannel.put({
        topic: CSP.Topic.GameSize,
        value: size
    });
    for (let i = 0; i < size * size; i++){
        await fieldOutChannel.take();
    }
    for (let swipe of swipes){
        fieldInChannel.put({
            topic: CSP.Topic.Swipe,
            value: swipe
        });
    }
    fieldInChannel.close();
    const tasks: Field.Task[] = [];
    while (true){
        const message = await fieldOutChannel.take();
        if (message === CSP.DONE){
            break;
        }
        const task = message.value as Field.Task;
        tasks.push(task);
    }
    return tasks;
};

const BASIC_SWIPE = {
    i: 0,
    j: 0,
    direction: {
        i: 1,
        j: 0
    }
} as Field.Swipe;

describe ('Field', () => {
    it('should output 2 tasks when recieve "swipe [0, 0] right"', async () => {
        const size = 3;
        const swipes = [BASIC_SWIPE];
        const tasks = await startSwipes(size, swipes);
        const actual = tasks.length;
        const expected = 2;
        expect(actual).to.equal(expected);
    });
    it('should output "Move" tasks ' +
        'when recieve "swipe [0, 0] right"', async () => 
    {
        const size = 3;
        const swipes = [BASIC_SWIPE];
        const tasks = await startSwipes(size, swipes);
        const actual = tasks.every(
            task => task.action === Field.TaskAction.Move
        );
        const expected = true;
        expect(actual).to.equal(expected);
    });
    it('should move [0, 0] right and [1, 0] left ' +
        'when recieve "swipe [0, 0] right"', async () => 
    {
        const size = 3;
        const swipes = [BASIC_SWIPE];
        const tasks = await startSwipes(size, swipes);
        let allMovesAreCorrect = true;
        for (let task of tasks){
            if (task.i === 0) {
                allMovesAreCorrect = task.j === 0;
                allMovesAreCorrect = task.additional.to.i === 1;
                allMovesAreCorrect = task.additional.to.j === 0;
            } else {
                allMovesAreCorrect = task.j === 0;
                allMovesAreCorrect = task.additional.to.i === 0;
                allMovesAreCorrect = task.additional.to.j === 0;
            }
        }
        const actual = allMovesAreCorrect;
        const expected = true;
        expect(actual).to.equal(expected);
    });
    it('should move [0, 0] up and [0, 1] down ' +
        'when recieve "swipe [0, 0] up"', async () => 
    {
        const size = 3;
        const swipes = [{
            i: 0,
            j: 0,
            direction: {
                i: 0,
                j: 1
            }
        }];
        const tasks = await startSwipes(size, swipes);
        let allMovesAreCorrect = true;
        for (let task of tasks){
            if (task.j === 0) {
                allMovesAreCorrect = task.i === 0;
                allMovesAreCorrect = task.additional.to.i === 0;
                allMovesAreCorrect = task.additional.to.j === 1;
            } else {
                allMovesAreCorrect = task.i === 0;
                allMovesAreCorrect = task.additional.to.i === 0;
                allMovesAreCorrect = task.additional.to.j === 0;
            }
        }
        const actual = allMovesAreCorrect;
        const expected = true;
        expect(actual).to.equal(expected);
    });
    it('should output nothing ' +
        'when trying to swipe out of the field', async () => 
    {
        const size = 3;
        const swipes: Field.Swipe[] = [];
        for (let i = 0; i < size; i++){
            swipes.push({
                i,
                j: 0,
                direction: {
                    i: 0,
                    j: -1
                }
            });
        }
        for (let i = 0; i < size; i++){
            swipes.push({
                i,
                j: size - 1,
                direction: {
                    i: 0,
                    j: 1
                }
            });
        }
        for (let j = 0; j < size; j++){
            swipes.push({
                i: 0,
                j,
                direction: {
                    i: -1,
                    j: 0
                }
            });
        }
        for (let j = 0; j < size; j++){
            swipes.push({
                i: size - 1,
                j,
                direction: {
                    i: 1,
                    j: 0
                }
            });
        }
        const tasks = await startSwipes(size, swipes);
        const actual = tasks.length;
        const expected = 0;
        expect(actual).to.equal(expected);
    });
    it('should make only one swap ' +
        'when trying to swipe busy zombiz', async () => 
    {
        const size = 3;
        const swipes = [
            BASIC_SWIPE,
            {
                i: 0,
                j: 0,
                direction: {
                    i: 0,
                    j: 1
                }
            },
            BASIC_SWIPE,
            {
                i: 1,
                j: 0,
                direction: {
                    i: 1,
                    j: 0
                }
            },
        ];
        const tasks = await startSwipes(size, swipes);
        const actual = tasks.length;
        const expected = 2;
        expect(actual).to.equal(expected);
    });
});