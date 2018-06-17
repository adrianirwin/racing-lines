import * as _ from 'lodash';
import * as Papa from 'papaparse';
import * as ecef from 'geodetic-to-ecef';

function from_csv(csv, callback) {
	window.console.log('parser.from_csv');

	return Papa.parse(csv, {
		'delimiter': ',',
		'dynamicTyping': true,
		'header': false
	});
}

function gps(data) {
	window.console.log('parser.gps');

	var gps_coords = [];
	data.forEach(function (row, index) {
		if (index > 0 && _.isNull(row[14]) === false && _.isNull(row[15]) === false) {
			gps_coords.push({
				'lat': row[14],
				'long': row[15]
			});
		}
	});
	return gps_coords;
}

function cartesian(data) {
	window.console.log('parser.cartesian');

	var cartesian_coords = [];
	data.forEach(function (point) {
		const cartesian_point = ecef(point.lat, point.long);
		if (_.isNaN(cartesian_point[0]) === false && _.isNaN(cartesian_point[1]) === false && _.isNaN(cartesian_point[2]) === false) {
			cartesian_coords.push({
				'x': cartesian_point[0],
				'y': cartesian_point[1],
				'z': cartesian_point[2]
			});
		}
	});
	return cartesian_coords;
}

function recenter(data, x, y, z) {
	window.console.log('parser.recenter');

	var recentered_coords = [];
	data.forEach(function (point) {
		recentered_coords.push({
			'x': (point.x + x),
			'y': (point.y + y),
			'z': (point.z + z)
		});
	});
	return recentered_coords;
}

function to_string(data) {
	window.console.log('parser.to_string');

	var strings = [];
	data.forEach(function (point) {
		strings.push(point.x + ' ' + point.y + ' ' + point.z);
	});
	return strings.join(', ');
}

export { from_csv, gps, cartesian, recenter, to_string };