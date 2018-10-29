//	Libraries
import * as _ from 'lodash';
import * as ecef from 'geodetic-to-ecef';
import * as Papa from 'papaparse';
import * as references from './../references';

self.addEventListener('message', (event) => {
	// const message = JSON.parse(_.get(event, 'data', {}));
	// const command = _.get(message, 'command', '');

	// switch (command) {
	// 	case 'start':
	// 		break;
	// 	default:
			const fileReader = new FileReader();

			fileReader.onload = function () {
				self.csv_to_object(self.atob(fileReader.result.split(',')[1]).replace(/"/g, ''));
			};
			fileReader.readAsDataURL(event.data[0]);
	// }
});

self.csv_to_object = function(csv) {
	self.console.log('loader.csv_to_object');

	//	TODO: Move out of here - add an alternate command to include this
	const device_profile = references.device('RaceCapture/Pro MK3');

	const parsed = Papa.parse(csv, { 'delimiter': ',', 'dynamicTyping': true, 'header': false });

	const points = [];
	const lap_boundaries = [];
	const bounds_coords = {
		'latitude_northmost': null,
		'latitude_southmost': null,
		'longitude_westmost': null,
		'longitude_eastmost': null
	};

	let gps_index = 0;
	let most_recent_lap = 0;

	parsed.data.forEach(function (row, index) {
		//	TODO: Interpolation

		const latitude = row[_.get(device_profile, 'log_indicies.gps.latitude')];
		const longitude = row[_.get(device_profile, 'log_indicies.gps.longitude')];

		const current_lap = row[_.get(device_profile, 'log_indicies.performance.current_lap')];

		//	Skip header row and rows without GPS coords
		//	TODO: Don't skip the non-GPS rows
		if (
			index > 0
			&& _.isNull(latitude) === false
			&& _.isNull(longitude) === false
		) {

			const point = new references.Racing_Line_Point();
			const cartesian_coords = ecef(latitude, longitude);

			references.value_to_point(point, 'coordinates.gps', {
				'latitude': latitude,
				'longitude': longitude
			});

			references.value_to_point(point, 'coordinates.cartesian.raw', {
				'x': cartesian_coords[0],
				'y': cartesian_coords[1],
				'z': cartesian_coords[2]
			});

			references.log_to_point(point, row, device_profile, 'g', ['x', 'y', 'z']);
			references.log_to_point(point, row, device_profile, 'rotation', ['yaw', 'pitch', 'roll']);
			references.log_to_point(point, row, device_profile, 'timing', ['interval', 'utc']);
			references.log_to_point(point, row, device_profile, 'performance', ['speed', 'current_lap']);
			references.log_to_point(point, row, device_profile, 'diagnostics', ['coolant_temperature', 'oil_temperature', 'oil_pressure', 'battery_voltage']);

			points.push(point);

			if (_.isNull(bounds_coords.latitude_northmost) === true || latitude > bounds_coords.latitude_northmost) {
				bounds_coords.latitude_northmost = latitude;
			}

			if (_.isNull(bounds_coords.latitude_southmost) === true || latitude < bounds_coords.latitude_southmost) {
				bounds_coords.latitude_southmost = latitude;
			}

			if (_.isNull(bounds_coords.longitude_westmost) === true || longitude > bounds_coords.longitude_westmost) {
				bounds_coords.longitude_westmost = longitude;
			}

			if (_.isNull(bounds_coords.longitude_eastmost) === true || longitude < bounds_coords.longitude_eastmost) {
				bounds_coords.longitude_eastmost = longitude;
			}

			if (most_recent_lap !== current_lap) {
				most_recent_lap = current_lap;
				lap_boundaries.push(gps_index);
			}
			gps_index++;
		}
	});

	//	Vector from the center of the Earth to the center of the bounds
	const vector_to_center = ecef(
		((bounds_coords.latitude_northmost + bounds_coords.latitude_southmost) / 2),
		((bounds_coords.longitude_westmost + bounds_coords.longitude_eastmost) / 2)
	);

	//	Re-center the XYZ points to have the center of the bounded area align to { x: 0, y: 0, z: 0 }
	points.forEach(function (point, index) {
		_.set(points, '[' + index + '].coordinates.cartesian.raw', {
			'x': (_.get(point, 'coordinates.cartesian.raw.x') - vector_to_center[0]),
			'y': (_.get(point, 'coordinates.cartesian.raw.y') - vector_to_center[1]),
			'z': (_.get(point, 'coordinates.cartesian.raw.z') - vector_to_center[2])
		});
	});

	//	Remove the '0' boundary
	lap_boundaries.splice(0, 1);

	self.postMessage(JSON.stringify({
		'command': 'metadata',
		'bounds_coords': bounds_coords,
		'vector_to_center': vector_to_center,
		'lap_boundaries': lap_boundaries
	}));

	let loop_index = 0;
	const loop_size = 2000;
	const loop_limit = points.length;

	const interval_id = self.setInterval((context) => {
		if ((loop_index * loop_size) < loop_limit) {
			self.postMessage(JSON.stringify({
				'command': 'points',
				'points': points.slice((loop_index * loop_size), ((loop_index + 1) * loop_size))
			}));
			loop_index++;
		} else {
			self.clearInterval(interval_id);
			self.postMessage(JSON.stringify({ 'command': 'terminate' }));
		}
	}, 1, self);
}