import { mergeMessages } from '../core.js';
import common from './common.js';
import today from './today.js';
import progress from './progress.js';
import schema from './schema.js';

export default mergeMessages(common, today, progress, schema);
