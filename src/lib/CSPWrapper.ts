import VendorChannel, * as VendorChannelLib from 'async-csp';

const enum Topic {
    GameSize,
    FieldTask,
    CloseChannel,
    Swipe
}

interface Message {
    topic: Topic,
    value: any
}

interface Channel{
    put: (message: Message) => Promise<undefined>;
    take: () => Promise<Message>;
    close: () => void;
}

const DONE = {
    topic: Topic.CloseChannel,
    value: VendorChannel.DONE
} as Message;

const createChannel = () => {
    var channel = new VendorChannel();
    return {
        put(message){
            return channel.put(message);
        },
        take(){
            return channel.take();
        },
        close(){
            channel.put(DONE);
            return channel.close();
        }
    } as Channel
};

const timeout = (delay: number) => {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
};

export {
    createChannel,
    Topic,
    DONE,
    Channel,
    timeout
};

