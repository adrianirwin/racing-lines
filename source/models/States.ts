import { BehaviorSubject, Subject } from 'rxjs'
import { Log } from './Logs'

export namespace State {
	export interface Sessions {
		[key: string]: Log.Session
	}

	export class Global {
		$session_added: Subject<Log.Session>
		$session_deleted: Subject<Log.Session>
		$sessions: BehaviorSubject<Sessions>

		constructor() {
			this.$session_added = new Subject<Log.Session>()
			this.$session_deleted = new Subject<Log.Session>()
			this.$sessions = new BehaviorSubject<Sessions>({} as Sessions)
		}

		add_session(session: Log.Session): boolean {
			const sessions = this.$sessions.getValue()
			if (sessions[session.name] === undefined) {
				sessions[session.name] = session
				this.$sessions.next(sessions)
				this.$session_added.next(session)
				return true
			}
			return false
		}

		delete_session(session: Log.Session): boolean {
			const sessions = this.$sessions.getValue()
			if (sessions[session.name] !== undefined) {
				delete sessions[session.name]
				this.$sessions.next(sessions)
				this.$session_deleted.next(session)
				return true
			}
			return false
		}
	}
}
