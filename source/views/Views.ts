import * as AFRAME from 'aframe'
import SessionThumbnail from './SessionThumbnail'

export namespace View {
	// TODO: Replace both of these with EntityMap<T>? Could search for all of the [key: string] type of things and replace them at once
	export interface AFRAMEEntityMap {
		[key: string]: AFRAME.Entity
	}

	export interface SessionThumbnailEntityMap {
		[key: string]: SessionThumbnail
	}
}
