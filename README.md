# Segments input audio to N segments of configurable size and overlap using [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg).

This service is connected with ['Manager'](https://github.com/mer-team/Tests/blob/rabbit-manager/Manager/manager.js) service through [RabbitMQ](https://www.rabbitmq.com/). 
Segments an audio file into smaller files (length and overlap can be defined). The output segments are saved with the settings of the original (codec, bits, channels, sample rate).

## Input through RabbitMQ
If used though RabbitMQ, the input is a JSON object containing:
* `inputFile`: name of the file to be segmented, which should be available in the `/Audios` folder.
* `segmentLength`: length (duration) of the desired segments in seconds
* `overlap`: the segment overlap in seconds (0 = no overlap, 10 = each segment contains the last 10 seconds of the previous segment)

Example:
```json
{
	"inputFile": "JiF3pbvR5G0.wav",
	"outputSettings": {
		"segmentLength": 30,
		"overlap": 15
	}
}
```
## Input using the Terminal
The CLI mode just expects the fileName as parameter, e.g., `node segmentationScript.js JiF3pbvR5G0.wav`

## Expected Output
The segmented audio files, numbered from 01 to NN, are saved next to the input file.

Through RabbitMQ:
```json
{
	"service": "audio-segmenter",
	"songId": "JiF3pbvR5G0.wav",
	"status": true,
	"payload": [{
		"segmentNumber": 1,
		"segmentFileName": "JiF3pbvR5G0_segment_01.wav",
		"startTime": 0,
		"endTime": 30,
		"duration": 30
	}, {
		"segmentNumber": 2,
		"segmentFileName": "JiF3pbvR5G0_segment_02.wav",
		"startTime": 15,
		"endTime": 45,
		"duration": 30
	}, {
	// (...)
    , {
		"segmentNumber": 27,
		"segmentFileName": "JiF3pbvR5G0_segment_27.wav",
		"startTime": 390,
		"endTime": 409.234286,
		"duration": 19.234285999999997
	}],
	"timestamp": "2023-08-24T18:11:35.953Z"
}
```

## Docker Params
| Arg | Default | Description |
| --- | --- | --- |
| HOST | localhost | RabbitMQ host |
| USER | guest | HTTP basic auth username  |
| PASS | guest | HTTP basic auth password |
| PORT | 5672 | RabbitMQ Port |
| MNG_PORT | 15672 | RabbitMQ Management Port |
| TIME | 10 | Timeout to check if the service is up |

## Volumes
| Container Path | Description |
| --- | --- |
| `/Audios` | Folder where the downloaded audio files are accessed and the segmented files are saved |

## Run Local Microservice
Run Rabbit
```
docker run -d -e RABBITMQ_DEFAULT_USER=merUser -e RABBITMQ_DEFAULT_PASS=passwordMER -p 15672:15672 -p 5672:5672 rabbitmq:3-management-alpine
```

Build local `segmentation` from source
```
docker build -t audio-segmentation:local .
```

Run local `segmentation`
```
docker run --rm -e TIME=10 -e USER=merUser -e PASS=passwordMER -e HOST=127.0.0.1 -e PORT=5672 -e MNG_PORT=15672 --net=host -v "Audios:/segmentation/Audios" audio-segmentation:local
```

Run official `segmentation` image locally
```
docker run -e TIME=10 -e USER=merUser -e PASS=passwordMER -e HOST=localhost -e PORT=5672 -e MNG_PORT=15672 --net=host -v "<Local DIR>:/Audios" merteam/segmentation:latest
```

## Tests
The tests can be accessed on the `test` folder. Tests list:
- [x] Check the RabbitMQ connection
- [x] Create a RabbitMQ channel
- [x] Send a music to split
- [x] Check if one of the expected generated files exists
- [ ] Check the output RabbitMQ response and compare it to the expected one (commented, only works locally)

## TO DO
Segmenting some formats will lead to variable sized segments when using the audioCodec('copy') option in ffmpeg. Fix is to reencode the segments: get input file codec/format, use that instead of copy, e.g., "libopus". This is slower. Copy works ok for WAV / uncompressed.