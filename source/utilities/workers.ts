export function clean_up_worker(worker: Worker, worker_message_handler: EventListenerOrEventListenerObject, event_type: string): void {
	worker.removeEventListener(event_type, worker_message_handler)
	// worker.terminate()
	// worker = undefined
	// worker_message_handler = undefined
}
