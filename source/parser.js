import * as _ from 'lodash';
import * as Papa from 'papaparse';
import * as ecef from 'geodetic-to-ecef';
import * as references from './references';

//	Parser settings
function from_csv(csv, callback) {
	window.console.log('parser.from_csv');

	return Papa.parse(csv, {
		'delimiter': ',',
		'dynamicTyping': true,
		'header': false
	});
}

//	Extract all data points that match the device profile
function racing_line_points(data, device_profile) {
	window.console.log('parser.racing_line_points');

	const racing_line_points = [];
	data.forEach(function (row, index) {
		//	TODO: Interpolation

		const latitude = row[_.get(device_profile, 'log_indicies.gps.latitude')];
		const longitude = row[_.get(device_profile, 'log_indicies.gps.longitude')];

		//	Skip header row and rows without GPS coords
		if (
			index > 0
			&& _.isNull(latitude) === false
			&& _.isNull(longitude) === false
		) {

			const racing_line_point = new references.Racing_Line_Point();

			references.value_to_point(racing_line_point, 'coordinates.gps', {
				'latitude': latitude,
				'longitude': longitude
			});

			references.log_to_point(racing_line_point, row, device_profile, 'g', ['x', 'y', 'z']);
			references.log_to_point(racing_line_point, row, device_profile, 'rotation', ['yaw', 'pitch', 'roll']);
			references.log_to_point(racing_line_point, row, device_profile, 'timing', ['interval', 'utc']);
			references.log_to_point(racing_line_point, row, device_profile, 'performance', ['speed', 'current_lap']);
			references.log_to_point(racing_line_point, row, device_profile, 'diagnostics', ['coolant_temperature', 'oil_temperature', 'oil_pressure', 'battery_voltage']);

			racing_line_points.push(racing_line_point);
		}
	});

	return racing_line_points;
}

//	Isolate lat/long coordinates from the data
function gps(data, device_profile) {
	window.console.log('parser.gps');

	const gps_coords = [];
	data.forEach(function (row, index) {
		//	Skip header row and rows without GPS coords
		if (
			index > 0
			&& _.isNull(row[_.get(device_profile, 'log_indicies.gps.latitude')]) === false
			&& _.isNull(row[_.get(device_profile, 'log_indicies.gps.longitude')]) === false
		) {
			gps_coords.push({
				lat: row[_.get(device_profile, 'log_indicies.gps.latitude')],
				long: row[_.get(device_profile, 'log_indicies.gps.longitude')]
			});
		}
	});
	return gps_coords;
}

//	Identify lap boundaries from the data
function laps(data, device_profile) {
	window.console.log('parser.laps');

	const lap_boundaries = [];
	var current_lap = null;
	var gps_index = 0;
	data.forEach(function (row, index) {
		//	Skip header row and rows without GPS coords
		if (
			index > 0
			&& _.isNull(_.get(row, 'coordinates.gps.latitude')) === false
			&& _.isNull(_.get(row, 'coordinates.gps.longitude')) === false
		) {
			if (current_lap !== _.get(row, 'performance.current_lap')) {
				current_lap = _.get(row, 'performance.current_lap');
				lap_boundaries.push(gps_index);
			}
			gps_index++;
		}
	});

	//	Remove the '0' boundary
	lap_boundaries.splice(0, 1);

	return lap_boundaries;
}

//	Determine the outer bounds of the data in lat/long
function bounds(data) {
	window.console.log('parser.bounds');

	const bounds_coords = {
		'latitude_northmost': null,
		'latitude_southmost': null,
		'longitude_westmost': null,
		'longitude_eastmost': null
	};
	data.forEach(function (row, index) {
		const latitude = _.get(row, 'coordinates.gps.latitude');
		const longitude = _.get(row, 'coordinates.gps.longitude');

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
	});
	return bounds_coords;
}

//	Convert lat/long to cartesian (x, y, z) coordinates
function cartesian(data) {
	window.console.log('parser.cartesian');

	data.forEach(function (point, index) {
		const cartesian_point = ecef(_.get(point, 'coordinates.gps.latitude'), _.get(point, 'coordinates.gps.longitude'));
		if (
			_.isNaN(cartesian_point[0]) === false
			&& _.isNaN(cartesian_point[1]) === false
			&& _.isNaN(cartesian_point[2]) === false
		) {
			_.set(data, '[' + index + '].coordinates.cartesian.raw', {
				'x': cartesian_point[0],
				'y': cartesian_point[1],
				'z': cartesian_point[2]
			});
		}
	});
}

//	Shift the data by the provided amount
function recenter(data, x, y, z) {
	window.console.log('parser.recenter');

	data.forEach(function (point, index) {
		_.set(data, '[' + index + '].coordinates.cartesian.raw', {
			'x': (_.get(point, 'coordinates.cartesian.raw.x') - x),
			'y': (_.get(point, 'coordinates.cartesian.raw.y') - y),
			'z': (_.get(point, 'coordinates.cartesian.raw.z') - z)
		});
	});
}

//	Smooth the data
function smooth(data, bounds, weights, points = false, interval = 50, listener = null, event_name = null) {
	window.console.log('parser.smooth');

	// const smoothed_points_by_bounds = [];
	// if (points === true) {
	// 	bounds.forEach(function () {
	// 		smoothed_points_by_bounds.push([]);
	// 	});
	// 	smoothed_points_by_bounds.push([]);
	// }

	//	Iterate on each point in the racing line
	// data.forEach(function (point, index) {
	const smooth_by_averages = function (data, point, index, length, listener, event_name) {
		const averaged_points = [];

		//	Find the point that is the average position of the points
		//	within the bounding limit around the point in question
		bounds.forEach(function (max_bound, bound_i) {

			//	TODO: Bounds should stretch at low rates of speed
			//	There's an implicit assumption about the distance
			//	between GPS points and the bounding counts that is
			//	not well understood at the moment.
			const bound = Math.min(max_bound, index, (data.length - index));
			const average_point = {'x': 0, 'y': 0, 'z': 0};

			if (bound > 0) {
				const points_to_average = data.slice((index - bound), (index + bound));

				points_to_average.forEach(function (point_to_average) {
					average_point.x += _.get(point_to_average, 'coordinates.cartesian.raw.x');
					average_point.y += _.get(point_to_average, 'coordinates.cartesian.raw.y');
					average_point.z += _.get(point_to_average, 'coordinates.cartesian.raw.z');
				});

				average_point.x = (average_point.x / points_to_average.length);
				average_point.y = (average_point.y / points_to_average.length);
				average_point.z = (average_point.z / points_to_average.length);
			} else {
				average_point.x = _.get(point, 'coordinates.cartesian.raw.x');
				average_point.y = _.get(point, 'coordinates.cartesian.raw.y');
				average_point.z = _.get(point, 'coordinates.cartesian.raw.z');
			}
			averaged_points.push(average_point);
			if (points === true) {
				smoothed_points_by_bounds[bound_i].push(average_point);
			}
		});

		//	Convert to Vector3 to use some of the built-in methods
		averaged_points.forEach(function (averaged_point, averaged_point_i) {
			averaged_points[averaged_point_i] = new THREE.Vector3(averaged_point.x, averaged_point.y, averaged_point.z);
		});

		//	Parse both the unit vectors and distances leading from the
		//	average point with the largest bounds, to the smallest
		const most_averaged_point = averaged_points[0].clone();
		const vectors_to_averaged_points = [];
		const vectors_between_averaged_points = [];
		const distances_between_averaged_points = [];
		for (var i = 1, l = averaged_points.length; i < l; i++) {
			vectors_to_averaged_points.push(averaged_points[i].clone().sub(most_averaged_point));

			const vector_between_averaged_points = averaged_points[i].clone().sub(averaged_points[(i - 1)]);
			distances_between_averaged_points.push(vector_between_averaged_points.length());
			vectors_between_averaged_points.push(vector_between_averaged_points.clone().normalize());
		}

		//	Work out the distance from the averaged point with the
		//	smallest bounds to the implied 'smoothed' point, then add
		//	all of the distances together
		var distance_rate_of_change_to_average = 0.0;
		for (var i = 1, l = distances_between_averaged_points.length; i < l; i++) {
			if (distances_between_averaged_points[(i - 1)] > distances_between_averaged_points[i]) {
				distance_rate_of_change_to_average += ((distances_between_averaged_points[i] / distances_between_averaged_points[(i - 1)]) * weights[(i - 1)]);
			} else {
				distance_rate_of_change_to_average += (1 * weights[(i - 1)]);
			}
		}
		const distance_to_smoothed_point = (distance_rate_of_change_to_average * _.last(distances_between_averaged_points));

		//	Work out the final vector to the implied 'smoothed' point
		const final_vector = _.last(vectors_between_averaged_points).clone().normalize();

		const rotation_axis_vector = new THREE.Vector3(0.0, 0.0, 0.0)
			.crossVectors(
				_.nth(vectors_between_averaged_points, -2),
				_.last(vectors_between_averaged_points)
			);

		//	Use the preceding angle between the smoothed points to
		//	predict the final angle
		//	TODO: This is wrapping around in some places, needs work
		// var angle_budget = (Math.PI / 2);
		// const angle = _.nth(vectors_between_averaged_points, -2).angleTo(_.last(vectors_between_averaged_points));
		// if (_.isNaN(angle) === false) {
		// 	angle_budget = Math.max((angle_budget - angle), 0);
		// 	final_vector.applyAxisAngle(rotation_axis_vector, angle_budget).normalize();
		// }

		//	Add the scaled vector to the most averaged point (largest
		//	boundary) and the least averaged point to calculate where
		//	the new implied 'smoothed' point is located in absolute
		//	terms.
		final_vector
			.multiplyScalar(distance_to_smoothed_point)
			.add(_.last(vectors_to_averaged_points))
			.add(most_averaged_point);

		const smoothed_point = {
			'x': final_vector.x,
			'y': final_vector.y,
			'z': final_vector.z
		};

		//	Broadcast the new point
		if (_.isNull(listener) === false && _.isNull(event_name) === false) {
			listener.dispatchEvent(new CustomEvent('smoothed', {
				'detail': {
					'point': smoothed_point, 'index': index, 'length': length }
				}
			));
		}

		//	Store point for returning as a separate data set
		// if (points === true) {
		// 	_.last(smoothed_points_by_bounds).push(smoothed_point)
		// }

		//	Update the input data set
		// _.set(data, '[' + index + '].coordinates.cartesian.smoothed', smoothed_point);
		return smoothed_point;
	}
	// });

	// if (points === true) {
	// 	return smoothed_points_by_bounds;
	// }

	var index_test = 0;
	var length = data.length;
	var smoothed_points = [];
	const temp_data = JSON.stringify(data);
	var cloned_data = JSON.parse(temp_data);
	var cloned_data_for_points = JSON.parse(temp_data);
	const loop = setInterval(() => {
		smoothed_points.push(smooth_by_averages(cloned_data, cloned_data_for_points.shift(), index_test, length, listener, event_name));
		index_test++;
		if (index_test >= length) {
			clearInterval(loop);
		}
	}, interval);
}

//	Vector to the center of the bounds
function vector_to_center(data) {
	window.console.log('parser.vector_to_center');

	return ecef(
		((data.latitude_northmost + data.latitude_southmost) / 2),
		((data.longitude_westmost + data.longitude_eastmost) / 2)
	);
}

//	Vector to the north pole
function vector_to_north_pole() {
	window.console.log('parser.vector_to_north_pole');

	return ecef(90, 0);
}

//	Prep coord data for AFrame
function coords_to_string(data, path) {
	window.console.log('parser.coords_to_string');

	const strings = [];
	data.forEach(function (point) {
		strings.push(_.get(point, path + '.x') + ' ' + _.get(point, path + '.y') + ' ' + _.get(point, path + '.z'));
	});
	return strings.join(', ');
}

//	Prep lap data for AFrame
function laps_to_string(data) {
	window.console.log('parser.laps_to_string');

	const strings = [];
	data.forEach(function (lap_start) {
		strings.push(lap_start);
	});
	return strings.join(', ');
}

//	Prep vector data for AFrame
function vector_to_string(data) {
	window.console.log('parser.vector_to_string');

	const strings = [];
	if (_.isUndefined(data.x) === false) {
		strings.push(data.x);
	}
	if (_.isUndefined(data.y) === false) {
		strings.push(data.y);
	}
	if (_.isUndefined(data.z) === false) {
		strings.push(data.z);
	}
	if (_.isUndefined(data.w) === false) {
		strings.push(data.w);
	}
	return strings.join(', ');
}

export { from_csv, racing_line_points, gps, laps, bounds, cartesian, recenter, smooth, vector_to_center, vector_to_north_pole, coords_to_string, laps_to_string, vector_to_string };