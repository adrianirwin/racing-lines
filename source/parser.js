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

	const gps_coords = [];
	data.forEach(function (row, index) {
		//	Skip header row and rows without GPS coords
		if (index > 0 && _.isNull(row[14]) === false && _.isNull(row[15]) === false) {
			gps_coords.push({
				lat: row[14],
				long: row[15]
			});
		}
	});
	return gps_coords;
}

//	Identify lap boundaries from the data
function laps(data) {
	window.console.log('parser.laps');

	const lap_boundaries = [];
	var current_lap = null;
	var gps_index = 0;
	data.forEach(function (row, index) {
		//	Skip header row and rows without GPS coords
		if (index > 0 && _.isNull(row[14]) === false && _.isNull(row[15]) === false) {
			if (current_lap !== row[28]) {
				current_lap = row[28];
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

	const cartesian_coords = [];
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

	const recentered_coords = [];
	data.forEach(function (point) {
		recentered_coords.push({
			'x': (point.x - x),
			'y': (point.y - y),
			'z': (point.z - z)
		});
	});
	return recentered_coords;
}

//	Smooth the data
function smooth(data, bounds, weights, points = false) {
	window.console.log('parser.smooth');

	const smoothed_coords = [];
	const smoothed_points_by_bounds = [];
	bounds.forEach(function () {
		smoothed_points_by_bounds.push([]);
	});
	smoothed_points_by_bounds.push([]);

	//	Iterate on each point in the racing line
	data.forEach(function (point, point_i) {
		const averaged_points = [];

		//	Find the point that is the average position of the points
		//	within the bounding limit around the point in question
		bounds.forEach(function (max_bound, bound_i) {

			//	TODO: Bounds should stretch at low rates of speed
			//	There's an implicit assumption about the distance
			//	between GPS points and the bounding counts that is
			//	not well understood at the moment.
			const bound = Math.min(max_bound, point_i, (data.length - point_i));
			const average_point = {'x': 0, 'y': 0, 'z': 0};

			if (bound > 0) {
				const points_to_average = data.slice((point_i - bound), (point_i + bound));

				points_to_average.forEach(function (point_to_average) {
					average_point.x += point_to_average.x;
					average_point.y += point_to_average.y;
					average_point.z += point_to_average.z;
				});

				average_point.x = (average_point.x / points_to_average.length);
				average_point.y = (average_point.y / points_to_average.length);
				average_point.z = (average_point.z / points_to_average.length);
			} else {
				average_point.x = point.x;
				average_point.y = point.y;
				average_point.z = point.z;
			}
			averaged_points.push(average_point);
			smoothed_points_by_bounds[bound_i].push(average_point);
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

		//	TODO: Reverse the order this is checked to catch instances
		//	where there are *multiple* segments that are too small
		for (var i = 1, l = distances_between_averaged_points.length; i < l; i++) {
			// distance_to_smoothed_point += distances_between_averaged_points[i];

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

		const angle = _.nth(vectors_between_averaged_points, -2).angleTo(_.last(vectors_between_averaged_points));
		if (_.isNaN(angle) === false) {
			final_vector.applyAxisAngle(rotation_axis_vector, angle).normalize();
		}

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

		smoothed_coords.push(smoothed_point);
		_.last(smoothed_points_by_bounds).push(smoothed_point)
	});

	if (points === true) {
		return smoothed_points_by_bounds;
	} else {
		return smoothed_coords;
	}
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

//	Prep coord data for AFrame
function coords_to_string(data) {
	window.console.log('parser.coords_to_string');

	const strings = [];
	data.forEach(function (point) {
		strings.push(point.x + ' ' + point.y + ' ' + point.z);
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

export { from_csv, gps, laps, bounds, cartesian, recenter, smooth, vector_to_center, vector_to_north_pole, coords_to_string, laps_to_string, vector_to_string };