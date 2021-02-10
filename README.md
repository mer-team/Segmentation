# Segment and downsampling of audio files returned by Spleeter using [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg).

This service is connected with ['Manager'](https://github.com/mer-team/Tests/blob/rabbit-manager/Manager/manager.js) service through [RabbitMQ](https://www.rabbitmq.com/). 
Segments an audio file into smaller files with 30 seconds length and 15 seconds of overlapping. This files are saved with one audio channel only and 22500 Hz of frequency.

Run `node segmentation.js`

## Input through RabbitMQ

The input is the videoID which is the folder that contains separated audio files.

## Output

Segmented audio files.

Through RabbitMQ:
```javascript
{ Service: 'Segmentation', Result: { vID: 'vID' } }
```