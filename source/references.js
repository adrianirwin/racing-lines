//	Libraries
import * as _ from 'lodash';

//	Convenience method to assign log indicies to the device profile
function assign_indicies(device_profiles, device, indicies) {
	_.forOwn(indicies, function (value, key) {
		_.set(device_profiles, device + '.log_indicies.' + key, value);
	});
}

function value_to_point(point, category, data) {
	_.forOwn(data, function (value, key) {
		_.set(point, category + '.' + key, value);
	});
}

function log_to_point(point, log_row, device_profile, category, data_keys) {
	_.forEach(data_keys, function (data_key) {
		_.set(point, category + '.' + data_key, log_row[_.get(device_profile, 'log_indicies.' + category + '.' + data_key)]);
	});
}

//	Instantiate a new device based on the named profile
function device(profile_name) {
	return Object.create(device_profiles[profile_name]);
}

//	Structure of the stored log indicies
function Log_Indicies () {
	this.gps = {'latitude': null, 'longitude': null};
	this.g = {'x': null, 'y': null, 'z': null};
	this.rotation = {'yaw': null, 'pitch': null, 'roll': null};
	this.timing = {'interval': null, 'utc': null};
	this.performance = {'speed': null, 'current_lap': null};
	this.diagnostics = {'coolant_temperature': null, 'oil_temperature': null, 'oil_pressure': null, 'battery_voltage': null};
}

//	Structure of the racing line points
function Racing_Line_Point() {
	this.coordinates = {
		'gps': {'latitude': null, 'longitude': null},
		'cartesian': {
			'raw': {'x': null, 'y': null, 'z': null},
			'smoothed': {'x': null, 'y': null, 'z': null}
		}
	};
	this.g = {'x': null, 'y': null, 'z': null};
	this.rotation = {'yaw': null, 'pitch': null, 'roll': null};
	this.timing = {'interval': null, 'utc': null};
	this.performance = {'speed': null, 'current_lap': null};
	this.diagnostics = {'coolant_temperature': null, 'oil_temperature': null, 'oil_pressure': null, 'battery_voltage': null};
}

//	Structure of the pre-programmed device profiles
const device_profiles = {
	'RaceCapture/Pro MK3': { 'log_indicies': new Log_Indicies() }
};


//
//	Assign indicies to the per-programmed devices
//

//	RaceCapture/Pro MK3
assign_indicies(device_profiles, 'RaceCapture/Pro MK3', {
	'gps.latitude': 14,
	'gps.longitude': 15,
	'g.x': 7,
	'g.y': 8,
	'g.z': 9,
	'rotation.yaw': 10,
	'rotation.pitch': 11,
	'rotation.roll': 12,
	'timing.interval': 0,
	'timing.utc': 1,
	'performance.speed': 16,
	'performance.current_lap': 28,
	'diagnostics.coolant_temperature': 2,
	'diagnostics.oil_temperature': 3,
	'diagnostics.oil_pressure': 4,
	'diagnostics.battery_voltage': 5
});

export { device, Racing_Line_Point, value_to_point, log_to_point };