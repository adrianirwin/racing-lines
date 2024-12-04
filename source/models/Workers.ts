export namespace WebWorker {
	export enum Task {
		GraphPointsBatch =			'GRAPH_POINTS_BATCH',
		GraphPointsFinished =		'GRAPH_POINTS_FINISHED',
		LogFileMetadataParsed =		'LOG_FILE_METADATA_PARSED',
		LogFilePointsParsed =		'LOG_FILE_POINTS_PARSED',
		PointsGraphed =				'POINTS_GRAPHED',
		PointsSmoothed =			'POINTS_SMOOTHER',
		SmoothPointsBatch =			'SMOOTH_POINTS_BATCH',
		SmoothPointsFinished =		'SMOOTH_POINTS_FINISHED',
		Terminate =					'TERMINATE',
	}
}
