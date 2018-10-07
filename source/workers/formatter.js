//	Libraries
import * as _ from 'lodash';
import * as references from './../references';

self.addEventListener('message', (event) => {
	const command = _.get(event, 'data.command', '');
	switch (command) {
		case 'start':
			self.format_raw_data(_.get(event, 'data.data', []), _.get(event, 'data.device_profile', {}));
			break;
	}
});

self.format_raw_data = function(data, device_profile) {
	self.console.log('formatter.format_raw_data');

	const points = [];
	data.forEach(function (row, index) {
		//	TODO: Interpolation

		const latitude = row[_.get(device_profile, 'log_indicies.gps.latitude')];
		const longitude = row[_.get(device_profile, 'log_indicies.gps.longitude')];

		//	Skip header row and rows without GPS coords
		//	TODO: Don't skip the non-GPS rows
		if (
			index > 0
			&& _.isNull(latitude) === false
			&& _.isNull(longitude) === false
		) {

			const point = new references.Racing_Line_Point();

			references.value_to_point(point, 'coordinates.gps', {
				'latitude': latitude,
				'longitude': longitude
			});

			references.log_to_point(point, row, device_profile, 'g', ['x', 'y', 'z']);
			references.log_to_point(point, row, device_profile, 'rotation', ['yaw', 'pitch', 'roll']);
			references.log_to_point(point, row, device_profile, 'timing', ['interval', 'utc']);
			references.log_to_point(point, row, device_profile, 'performance', ['speed', 'current_lap']);
			references.log_to_point(point, row, device_profile, 'diagnostics', ['coolant_temperature', 'oil_temperature', 'oil_pressure', 'battery_voltage']);

			points.push(point);
		}
	});

	self.postMessage({ 'command': 'points', 'points': points });
	self.postMessage({ 'command': 'terminate' });
	return;
}