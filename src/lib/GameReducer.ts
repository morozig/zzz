import Immutable from 'immutable';
import * as CSP from './CSPWrapper';

interface Action {
    value: string;
}

const reducer = (
        data?: Immutable.Map<string, any>,
        action?: Action
    ) => {
    if (!data) return Immutable.Map<string, any>({page: 'Home'});
    switch (action.value){
        case 'play':
            return data.set('page', 'Playing');
        case 'home':
            return data.set('page', 'Home');
    }
    return data;
};

export {
    reducer,
    Action
}