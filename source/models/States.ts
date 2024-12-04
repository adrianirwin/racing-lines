import { Log } from './Logs'

export namespace State {
	export interface Files {
		[key: string]: Log.File & Log.LoadedValues
	}
}