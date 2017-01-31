import { expect } from 'chai';
import * as Field from '../../src/lib/Field';
import * as CSP from '../../src/lib/CSPWrapper';

// const describe = (message: string, test: () => void) => {test()};
// const it = (message: string, test: () => void) => {test()};

const start = async (size: number) => {
    const fieldInChannel = CSP.createChannel();
    const fieldOutChannel = Field.pipe(fieldInChannel);
    fieldInChannel.put({
        topic: CSP.Topic.GameSize,
        value: size
    });
    fieldInChannel.close();
    const tasks: Field.FieldTask[] = [];
    while (true){
        const message = await fieldOutChannel.take();
        if (message === CSP.DONE){
            break;
        }
        const task = message.value as Field.FieldTask;
        tasks.push(task);
    }
    return tasks;
};

describe ('Field', () => {
    it('should close output when recieve "start DONE"', async () => {
        const fieldInChannel = CSP.createChannel();
        const fieldOutChannel = Field.pipe(fieldInChannel);
        fieldInChannel.close();
        const actual = await fieldOutChannel.take();
        const expected = CSP.DONE;
        expect(actual).to.equal(expected);
    });
    it('should output 25 tasks when recieve "start 5"', async () => {
        const tasks = await start(5);
        const actual = tasks.length;
        const expected = 25;
        expect(actual).to.equal(expected);
    });
    it('should output 64 tasks when recieve "start 8"', async () => {
        const tasks = await start(8);
        const actual = tasks.length;
        const expected = 64;
        expect(actual).to.equal(expected);
    });
    it('should output "Start" tasks when recieve "start 8"', async () => {
        const tasks = await start(8);
        const actual = tasks.every(
            task => task.action === Field.TaskAction.CreateZombi
        );
        const expected = true;
        expect(actual).to.equal(expected);
    });
    it('should output task for every tile in square ' +
        'when recieve "start 8"', async () => 
    {
        const size = 8;
        const tasks = await start(size);
        let allTilesAreInTasks = true;
        for (let i = 0; i < size; i++){
            for (let j = 0; j < size; j++){
                if (!tasks.find(task => task.i === i && task.j === j)){
                    allTilesAreInTasks = false;
                }
            }
        }
        const actual = allTilesAreInTasks;
        const expected = true;
        expect(actual).to.equal(expected);
    });
    it('should generate different zombiz ' +
        'when recieve "start 8"', async () => 
    {
        const size = 8;
        const tasks = await start(size);
        const allColours = new Set(tasks.map(task => task.colour));
        const moreThanOneColourPresent = allColours.size > 1;
        const actual = moreThanOneColourPresent;
        const expected = true;
        expect(actual).to.equal(expected);
    });
    it('should generate every zombi ' +
        'when recieve "start 10"', async () => 
    {
        const size = 10;
        const tasks = await start(size);
        const allColours = new Set(tasks.map(task => task.colour));
        const allColoursPresent = allColours.size === 7;
        const actual = allColoursPresent;
        const expected = true;
        expect(actual).to.equal(expected);
    });
    it('should generate same tasks ' +
        'each run when recieve "start 2"', async () => 
    {
        const size = 2;
        let tasks = await start(size);
        const result1 = new Set(tasks.map(
            task => `${task.i}${task.j}${task.colour}`
        ));
        tasks = await start(size);
        const result2 = new Set(tasks.map(
            task => `${task.i}${task.j}${task.colour}`
        ));
        const intersection = new Set([...result1].filter(x => result2.has(x)));
        const resultsAreSame = intersection.size === 4;
        const actual = resultsAreSame;
        const expected = true;
        expect(actual).to.equal(expected);
    });
    it('should generate different tasks ' +
        'each run when recieve "start 8"', async () => 
    {
        const size = 8;
        let tasks = await start(size);
        const result1 = new Set(tasks.map(
            task => `${task.i}${task.j}${task.colour}`
        ));
        tasks = await start(size);
        const result2 = new Set(tasks.map(
            task => `${task.i}${task.j}${task.colour}`
        ));
        const intersection = new Set([...result1].filter(x => result2.has(x)));
        const resultsAreDifferent = intersection.size < 33;
        const actual = resultsAreDifferent;
        const expected = true;
        expect(actual).to.equal(expected);
    });
});