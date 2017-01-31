const enum Status {
    Idle,
    Busy,
    Falling,
    Dead
}

interface Element {
    colour: number;
    status: number;
}

interface Position {
    i: number;
    j: number;
}

interface Difference {
    toFall: number[][];
    toIdle: boolean[][];
    toNull: boolean[][];
}

const findGroupsInLine = (line: Element[]) => {
    const groups: Element[][] = [];
    let group: Element[] = [];
    const flush = () => {
        if (group.length >= 3){
            groups.push(group);
        }
        group = [];
    };
    for (const element of line){
        if (element && element.status == Status.Idle){
            const groupColour = !group[0] || group[0].colour;
            if (element.colour !== groupColour) flush();
            group.push(element);
        } else flush();
    }
    flush();
    return groups;
}

const find = (field: Element[][]) => {
    let groups = [] as Element[][];
    for (const colomn of field){
        const similars = findGroupsInLine(colomn);
        groups = groups.concat(similars);
    }
    const height = field
        .map(colomn => colomn.length)
        .reduce((min, cur) => Math.min(min, cur));
    for (let j = 0; j < height; j++){
        const line = field.map(colomn => colomn[j]);
        const similars = findGroupsInLine(line);
        groups = groups.concat(similars);
    }
    groups = groups.reduce((prev, current) => {
        const intersections = prev.filter(
            group => group.some(element => current.includes(element))
        );
        if (intersections.length > 0){
            let combinedGroup = current.slice();
            for (const group of intersections){
                combinedGroup = combinedGroup.concat(
                    group.filter(element => !current.includes(element))
                );
            }
            prev = [combinedGroup].concat(prev.filter(
                group => group.every(element => !current.includes(element))
            ));
        } else prev.push(current);
        return prev;
    }, [] as Element[][]);
    return groups;
};

const randomColour = (size: number) => {
    const maxColours = 7;
    const differentColours = Math.min(size - 1, maxColours);
    return Math.floor(Math.random() * differentColours);
};

const gravitate = (field: Element[][]) => {
    const toFall: number[][] = [];
    const toIdle: boolean[][] = [];
    const toNull: boolean[][] = [];
    field.forEach((colomn, i) => {
        var interval = 0;
        colomn.forEach((element, j) => {
            if (interval == 0){
                if (!element || element.status == Status.Dead){
                    interval++;
                } else if (element.status == Status.Falling){
                    toIdle[i] = toIdle[i] || [];
                    toIdle[i][j] = true;
                }
            } else {
                if (!element || element.status == Status.Dead){
                    interval++;
                } else if (element.status == Status.Busy){
                    while (interval > 0){
                        toNull[i] = toNull[i] || [];
                        toNull[i][j - interval] = true;
                        interval--;
                    }
                } else {
                    toFall[i] = toFall[i] || [];
                    toFall[i][j] = interval;
                }
            }
        });
        if (interval > 0){
            for (var j = 0; j < interval; j++){
                toFall[i] = toFall[i] || [];
                toFall[i][colomn.length + j] = interval;
            }
        }
    });
    return {toFall, toIdle, toNull} as Difference;
};

const generateColours: (size: number) => number[][] = (size: number) => {
    const colours: number[][] = [];
    const elements: Element[][] = [];
    for (let i = 0; i < size; i++){
        elements[i] = [];
        for (let j = 0; j < size; j++){
            const colour = randomColour(size);
            const status = Status.Idle;
            elements[i][j] = {colour, status};
        }
    }
    let groups = find(elements);
    while(groups.length > 0){
        for(const group of groups){
            for(const element of group){
                element.colour = randomColour(size);
            }
        }
        groups = find(elements);
    }
    const hints = hint(elements);
    if (size > 2 && hints.length === 0) return generateColours(size);
    for (let i = 0; i < size; i++){
        colours[i] = [];
        for (let j = 0; j < size; j++){
            const colour = elements[i][j].colour;
            colours[i][j] = colour;
        }
    }
    return colours;
};

const findDoublesInLine = (line: Element[]) => {
    const doubles: number[][] = [];
    const equalColours = (a: Element, b: Element) => {
        if (!a || !b) return false;
        if (a.status !== Status.Idle || b.status !== Status.Idle) return false;
        return a.colour === b.colour;
    };
    for (let i = 1; i < line.length; i++){
        if (equalColours(line[i], line[i - 1])){
            doubles.push([i - 1, i]);
        } else if (equalColours(line[i], line[i - 2])){
            doubles.push([i - 2, i]);
        }
    }
    return doubles;
}

const getHintsAroundDouble = (double: Position[], field: Element[][]) => {
    const hints: Set<Element> = new Set();
    const a = double[0];
    const b = double[1];
    const colour = field[a.i][a.j].colour;
    const checkPosition = (position:Position) => {
        if (!field[position.i] || !field[position.i][position.j]) return false;
        if (field[position.i][position.j].colour === colour){
            return true;
        }
        return false;
    };
    if (a.i === b.i){
        if (a.j === b.j - 1){
            if (checkPosition({i: a.i, j: b.j + 2})){
                hints.add(field[a.i][b.j + 1]);
                hints.add(field[a.i][b.j + 2]);
            }
            if (checkPosition({i: a.i + 1, j: b.j + 1})){
                hints.add(field[a.i][b.j + 1]);
                hints.add(field[a.i + 1][b.j + 1]);
            }
            if (checkPosition({i: a.i + 1, j: a.j - 1})){
                hints.add(field[a.i][a.j - 1]);
                hints.add(field[a.i + 1][a.j - 1]);
            }
            if (checkPosition({i: a.i, j: a.j - 2})){
                hints.add(field[a.i][a.j - 1]);
                hints.add(field[a.i][a.j - 2]);
            }
            if (checkPosition({i: a.i - 1, j: a.j - 1})){
                hints.add(field[a.i][a.j - 1]);
                hints.add(field[a.i - 1][a.j - 1]);
            }
            if (checkPosition({i: a.i - 1, j: b.j + 1})){
                hints.add(field[a.i][b.j + 1]);
                hints.add(field[a.i - 1][b.j + 1]);
            }
        } else {
            if (checkPosition({i: a.i + 1, j: a.j + 1})){
                hints.add(field[a.i][a.j + 1]);
                hints.add(field[a.i + 1][a.j + 1]);
            }
            if (checkPosition({i: a.i - 1, j: a.j + 1})){
                hints.add(field[a.i][a.j + 1]);
                hints.add(field[a.i - 1][a.j + 1]);
            }
        }
    } else {
        if (a.i === b.i - 1){
            if (checkPosition({i: b.i + 2, j: a.j})){
                hints.add(field[b.i + 1][a.j]);
                hints.add(field[b.i + 2][a.j]);
            }
            if (checkPosition({i: b.i + 1, j: a.j + 1})){
                hints.add(field[b.i + 1][a.j]);
                hints.add(field[b.i + 1][a.j + 1]);
            }
            if (checkPosition({i: a.i - 1, j: a.j + 1})){
                hints.add(field[a.i - 1][a.j]);
                hints.add(field[a.i - 1][a.j + 1]);
            }
            if (checkPosition({i: a.i - 2, j: a.j})){
                hints.add(field[a.i - 1][a.j]);
                hints.add(field[a.i - 2][a.j]);
            }
            if (checkPosition({i: a.i - 1, j: a.j - 1})){
                hints.add(field[a.i - 1][a.j]);
                hints.add(field[a.i - 1][a.j - 1]);
            }
            if (checkPosition({i: b.i + 1, j: a.j - 1})){
                hints.add(field[b.i + 1][a.j]);
                hints.add(field[b.i + 1][a.j - 1]);
            }
        } else {
            if (checkPosition({i: a.i + 1, j: a.j + 1})){
                hints.add(field[a.i + 1][a.j]);
                hints.add(field[a.i + 1][a.j + 1]);
            }
            if (checkPosition({i: a.i + 1, j: a.j - 1})){
                hints.add(field[a.i + 1][a.j]);
                hints.add(field[a.i + 1][a.j - 1]);
            }
        }
    }
    return hints;
};

const hint = (field: Element[][]) => {
    const hints: Set<Element> = new Set();
    let doubles: Position[][] = [];
    for (let i = 0; i < field.length; i++){
        const line = field[i];
        const doublesInLine = findDoublesInLine(line);
        doubles = doubles.concat(doublesInLine.map(
            (double) => double.map((j) => {
                return {i, j}
            })
        ));
    }
    const height = field[0].length;
    for (let j = 0; j < height; j++){
        const line = field.map(colomn => colomn[j]);
        const doublesInLine = findDoublesInLine(line);
        doubles = doubles.concat(doublesInLine.map(
            (double) => double.map((i) => {
                return {i, j}
            })
        ));
    }
    for (const double of doubles){
        for (const hint of getHintsAroundDouble(double, field)){
            hints.add(hint);
        }
    }
    return [...hints];
};

export {
    Element,
    Difference,
    Status,
    find,
    gravitate,
    generateColours,
    randomColour,
    hint
}