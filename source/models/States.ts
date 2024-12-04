import { Log } from './Logs'

export namespace State {
	export interface Sessions {
		[key: string]: Log.Session
	}
}