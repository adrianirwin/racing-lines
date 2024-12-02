import assign from 'lodash/assign'
import forEach from 'lodash/forEach'
import forOwn from 'lodash/forOwn'
import get from 'lodash/get'
import isNaN from 'lodash/isNaN'
import isNumber from 'lodash/isNumber'
import set from 'lodash/set'
import {
	Device,
	RacingLinePoint,
} from './../models/racing_lines'

//	Convenience method to assign log indicies to the device profile
function assign_indicies(device_profiles: Device.Profiles, device_name: string, indicies: { [key: string]: number }): void {
	forOwn(indicies, (value: number, key: string) => {
		set(device_profiles, device_name + '.log_indicies.' + key, value)
	})
}

// TODO: Unused
// function value_to_point(point: RacingLinePoint, category: string, data: any): void {
// 	forOwn(data, function (value, key) {
// 		set(point, category + '.' + key, value)
// 	})
// }

function log_to_point(point: RacingLinePoint, log_row: Array<number>, device_profile: Device.Profile, category: string, data_keys: Array<string>): void {
	forEach(data_keys, function (data_key) {
		set(point, category + '.' + data_key, log_row[get(device_profile, 'log_indicies.' + category + '.' + data_key)])
	})
}

function delta_to_point(point: RacingLinePoint, previous_point: RacingLinePoint | null, category: string, key: string, reference_category: string, reference_key: string): void {
	const value: number = get(point, reference_category + '.' + reference_key)
	const previous_value: number = get(previous_point, reference_category + '.' + reference_key)

	if (isNaN(previous_value) === false && isNumber(previous_value) === true) {
		set(point, category + '.' + key, (value - previous_value))
	}
	else {
		set(point, category + '.' + key, NaN)
	}
}

//	Instantiate a new device based on the named profile
function device(profile_name: string): Device.Profile {
	return assign({}, device_profiles[profile_name])
}

//	Structure of the pre-programmed device profiles
const device_profiles: Device.Profiles = {
	'RaceCapture/Pro MK3': { log_indicies: new Device.LogIndicies() }
}


//
//	Assign indicies to the per-programmed devices
//

//	RaceCapture/Pro MK3
assign_indicies(device_profiles, 'RaceCapture/Pro MK3', {
	'gps.latitude': 14, 'gps.longitude': 15,
	'g.x': 7, 'g.y': 8, 'g.z': 9,
	'rotation.yaw': 10, 'rotation.pitch': 11, 'rotation.roll': 12,
	'timing.interval': 0, 'timing.utc': 1,
	'performance.speed': 16, 'performance.current_lap': 28,
	'diagnostics.coolant_temperature': 2, 'diagnostics.oil_temperature': 3, 'diagnostics.oil_pressure': 4, 'diagnostics.battery_voltage': 5
})

export { device, log_to_point, delta_to_point }
