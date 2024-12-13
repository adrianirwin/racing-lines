import { Config } from './Configs'
import { State } from './States'

export class Global {
	private static config_instance: Config.Global
	private static state_instance: State.Global

	private constructor() {}

	public static get State(): State.Global {
		if (!Global.state_instance) {
			Global.state_instance = new State.Global()
		}
		return Global.state_instance
	}

	public static get Config(): Config.Global {
		if (!Global.config_instance) {
			Global.config_instance = new Config.Global()
		}
		return Global.config_instance
	}
}
