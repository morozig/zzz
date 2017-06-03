import * as CSP from './CSPWrapper';
import Immutable from 'immutable';
import * as WorldReducer from './WorldReducer';
import { WorldState,
    WorldAction,
    Zombi,
    reducer,
    Status,
    ZombiType
 } from './WorldReducer';

interface World {
    dispatch: (action: WorldAction) => void;
    outChannel: CSP.GenericChannel<WorldState>;
}

const createWorld = () => {
    const outChannel = CSP.createGenericChannel<WorldState>();
    let worldState = reducer();
    const dispatch = (action: WorldAction) => {
        worldState = reducer(worldState, action);
    };
    setInterval(() => {
        const timedState = reducer(worldState);
        if (timedState !== worldState){
            worldState = timedState;
            outChannel.put(worldState);
        }
    }, 1000 / 60);
    outChannel.put(worldState);
    return {dispatch, outChannel} as World;
};

export{
     createWorld,
     WorldState,
     Zombi,
     WorldAction,
     World,
     Status,
     ZombiType
}