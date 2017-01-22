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

const generateColours = (size: number) => {
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
    for (let i = 0; i < size; i++){
        colours[i] = [];
        for (let j = 0; j < size; j++){
            const colour = elements[i][j].colour;
            colours[i][j] = colour;
        }
    }
    return colours;
};

export {
    Element,
    Difference,
    Status,
    find,
    gravitate,
    generateColours,
    randomColour
}