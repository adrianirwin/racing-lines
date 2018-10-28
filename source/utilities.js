//	Libraries
import * as _ from 'lodash';

function clean_up_worker(worker, worker_message_handler, event_type) {
	worker.removeEventListener(event_type, worker_message_handler);
	// worker.terminate();
	// worker = undefined;
	worker_message_handler = undefined;
}

export { clean_up_worker };