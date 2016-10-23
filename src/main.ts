import * as CSP from './lib/CSPWrapper';
import * as Field from './lib/Field';
import * as ViewField from './lib/ViewField';

const fieldInChannel = CSP.createChannel();
const fieldOutChannel = Field.pipe(fieldInChannel);
const viewFieldOutChannel = ViewField.pipe(fieldOutChannel);

fieldInChannel.put({
    topic: CSP.Topic.GameSize,
    value: 8
});