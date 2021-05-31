# Segment and downsampling of audio files returned by Spleeter using [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg).

This service is connected with ['Manager'](https://github.com/mer-team/Tests/blob/rabbit-manager/Manager/manager.js) service through [RabbitMQ](https://www.rabbitmq.com/). 
Segments an audio file into smaller files with 30 seconds length and 15 seconds of overlapping. This files are saved with one audio channel only and 22500 Hz of frequency.

Run `node segmentation.js`

## Input through RabbitMQ
The input is the videoID which is the folder that contains separated audio files.
Example:
```
JiF3pbvR5G0
```

## Output
Segmented audio files.

Through RabbitMQ:
```javascript
{ Service: 'Segmentation', Result: { vID: 'vID' } }
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
docker build -t segmentation:local .
```

Run local `segmentation`
```
docker run -e TIME=10 -e USER=merUser -e PASS=passwordMER -e HOST=localhost -e PORT=5672 -e MNG_PORT=15672 --net=host -v "<Local DIR>:/Audios" segmentation:local
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