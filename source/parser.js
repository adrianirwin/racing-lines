import * as _ from 'lodash';
import * as Papa from 'papaparse';
import * as ecef from 'geodetic-to-ecef';

//	Parser settings
function from_csv(csv, callback) {
	window.console.log('parser.from_csv');

	return Papa.parse(csv, {
		'delimiter': ',',
		'dynamicTyping': true,
		'header': false
	});
}

//	Isolate the lat/long from the data
function gps(data) {
	window.console.log('parser.gps');

	var gps_coords = [];
	data.forEach(function (row, index) {
		if (index > 0 && _.isNull(row[14]) === false && _.isNull(row[15]) === false) {
			gps_coords.push({
				lat: row[14],
				long: row[15]
			});
		}
	});
	return gps_coords;
}

//	Determine the outer bounds of the data in lat/long
function bounds(data) {
	window.console.log('parser.bounds');

	var bounds_coords = {
		lat_northmost: null,
		lat_southmost: null,
		long_westmost: null,
		long_eastmost: null
	};
	data.forEach(function (row, index) {
		if (_.isNull(bounds_coords.lat_northmost) === true || row.lat > bounds_coords.lat_northmost) {
			bounds_coords.lat_northmost = row.lat;
		}

		if (_.isNull(bounds_coords.lat_southmost) === true || row.lat < bounds_coords.lat_southmost) {
			bounds_coords.lat_southmost = row.lat;
		}

		if (_.isNull(bounds_coords.long_westmost) === true || row.long > bounds_coords.long_westmost) {
			bounds_coords.long_westmost = row.long;
		}

		if (_.isNull(bounds_coords.long_eastmost) === true || row.long < bounds_coords.long_eastmost) {
			bounds_coords.long_eastmost = row.long;
		}
	});
	return bounds_coords;
}

//	Convert lat/long to cartesian (x, y, z) coordinates
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

//	Shift the data by the provided amount
function recenter(data, x, y, z) {
	window.console.log('parser.recenter');

	var recentered_coords = [];
	data.forEach(function (point) {
		recentered_coords.push({
			'x': (point.x - x),
			'y': (point.y - y),
			'z': (point.z - z)
		});
	});
	return recentered_coords;
}

//	Vector to the center of the bounds
function vector_to_center(data) {
	window.console.log('parser.vector_to_center');

	return ecef(
		((data.lat_northmost + data.lat_southmost) / 2),
		((data.long_westmost + data.long_eastmost) / 2)
	);
}

//	Vector to the north pole
function vector_to_north_pole() {
	window.console.log('parser.vector_to_north_pole');

	return ecef(90, 0);
}

//	Prep data for AFrame
function to_string(data) {
	window.console.log('parser.to_string');

	var strings = [];
	data.forEach(function (point) {
		strings.push(point.x + ' ' + point.y + ' ' + point.z);
	});
	return strings.join(', ');
}

export { from_csv, gps, bounds, cartesian, recenter, vector_to_center, vector_to_north_pole, to_string };