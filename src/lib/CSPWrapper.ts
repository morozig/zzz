import VendorChannel, * as VendorChannelLib from 'async-csp';

const enum Topic {
    GameSize,
    FieldTask,
    CloseChannel,
    Swipe,
    FieldTaskDone,
    NewPoints,
    ButtonPressed
}

interface Message {
    topic: Topic,
    value: any
}

interface Channel{
    put: (message: Message) => Promise<undefined>;
    take: () => Promise<Message>;
    close: () => void;
    pipe: (...channels: Channel[]) => void;
}

interface GenericChannel<T>{
    put: (message: T) => Promise<undefined>;
    take: () => Promise<T>;
    close: () => void;
    pipe: (...channels: GenericChannel<T>[]) => void;
}

const DONE = {
    topic: Topic.CloseChannel,
    value: VendorChannel.DONE
} as Message;

const createGenericChannel = <T>() => {
    var channel = new VendorChannel();
    return {
        put(message: T){
            return channel.put(message);
        },
        take(){
            return channel.take();
        },
        close(){
            channel.put(DONE);
            return channel.close();
        },
        pipe(...channels: GenericChannel<T>[]){
            return channel.pipe(...channels);
        }
    } as GenericChannel<T>
};

const createChannel = () => createGenericChannel<Message>() as Channel;

const timeout = (delay: number) => {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
};

export {
    createChannel,
    createGenericChannel,
    Message,
    Topic,
    DONE,
    Channel,
    GenericChannel,
    timeout
};

