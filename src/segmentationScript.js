const amqp = require('amqplib');
const ffmpeg = require('fluent-ffmpeg');
const util = require('util');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const ffprobe = util.promisify(ffmpeg.ffprobe);

const greenCheckbox = '\x1b[32m\u2713\x1b[0m'; // Green checkbox with ANSI escape codes
const yellowInfo = `\x1b[33mℹ\x1b[0m`; // Yellow info character with ANSI escape codes
const redCrossmark = '\x1b[31m\u274C\x1b[0m'; // Red crossmark with ANSI escape codes

const user = process.env.USER || 'guest';
const pass = process.env.PASS || 'guest';
const host = process.env.HOST || 'localhost';
const port = process.env.PORT || 5672;
const queue_in = process.env.QUEUE_IN || 'audio-segmentation';
const queue_out = process.env.QUEUE_OUT || 'mer-manager';
const serviceName = "audio-segmenter"
let connection = null, channel = null;

function printProgress(progress) {
    readline.clearLine(process.stdout);
    readline.cursorTo(process.stdout, 0); //https://stackoverflow.com/questions/41986317/process-stdout-doest-have-function-clearline-in-childprocess
    process.stdout.write(`Converting: ${progress.toFixed(2)}%`);
}

function createSegment(inputFile, outputFilePath, startTime, duration) {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(inputFile)
            .setStartTime(startTime)
            .setDuration(duration)
            .audioCodec('copy') //TODO: if the input is mp3 or webm the duration will vary (needs to force reencode!)
            .output(outputFilePath)
            .on('end', () => {
                console.log(" [%s] Segment created: %s", greenCheckbox, outputFilePath);
                resolve();
            })
            .on('error', (err) => {
                console.error(" [%s] Error creating segment %s. Error: %s", redCrossmark, outputFilePath, err);
                reject(err);
            })
            .run();
    });
}

async function createAudioSegments(inputFile, segmentLength, overlap) {

    if (segmentLength <= 0 || overlap < 0 || overlap >= segmentLength)
    {
        console.error(" [%s] Error segmenting file %s. Invalid segment length: %s or overlap: %s", redCrossmark, segmentLength, overlap);
        notifyManager(channel, queue_out, inputFile, false, null);
        return;
    }

    const inputDirectory = path.dirname(inputFile);
    const inputExtension = path.extname(inputFile);
    const inputFileName = path.basename(inputFile, inputExtension);

    try {
        const metadata = await ffprobe(inputFile);
        const totalDuration = metadata.format.duration;
        const numSegments = Math.ceil((totalDuration - overlap) / (segmentLength - overlap));
        const segmentsInfo = [];

        console.log(" [%s] Segmenting %s into %s clips of %s seconds with %s seconds of overlap.", yellowInfo, inputFile, numSegments, segmentLength, overlap);

        for (let i = 0; i < numSegments; i++) {
            const segmentNumber = String(i + 1).padStart(Math.ceil(Math.log10(numSegments + 1)), '0');
            const outputFileName = `${inputFileName}_segment_${segmentNumber}${inputExtension}`;
            const outputFilePath = path.join(inputDirectory, outputFileName);
            const startTime = i * (segmentLength - overlap);
            const duration = Math.min(segmentLength, totalDuration - startTime);
            await createSegment(inputFile, outputFilePath, startTime, duration);

            segmentsInfo.push({
                segmentNumber: (i + 1),
                segmentFileName: outputFileName,
                startTime: startTime,
                endTime: startTime + duration,
                duration: duration
            });
        }

        //saveSegmentsInfoToJson(segmentsInfo, inputDirectory);
        notifyManager(channel, queue_out, inputFile, true, segmentsInfo);
        //console.log(JSON.stringify(segmentsInfo, null, 2));
        console.log(' [%s] File %s divided into %s segments successfully.', greenCheckbox, inputFile, segmentsInfo.length);
    } catch (err) {
        console.error(" [%s] Error segmenting file %s. Error: %s", redCrossmark, inputFile, err);
        notifyManager(channel, queue_out, inputFile, false, null);
    }
}

function saveSegmentsInfoToJson(segmentsInfo, outputDirectory) {
    const jsonFilePath = path.join(outputDirectory, 'segments.json');
    fs.writeFileSync(jsonFilePath, JSON.stringify(segmentsInfo, null, 2));
    console.log('Segments information saved to segments.json');
}

/*
 * Notify the MERmaid manager service over queue_out RabbitMQ queue
 */
async function notifyManager(channel, queue, songId, status, payload) {
    const message = {
        service: serviceName,
        songId: songId,
        status: status,
        payload: payload,
        timestamp: new Date().toISOString(),
    };

    const messageBuffer = Buffer.from(JSON.stringify(message));

    if (channel) {
        await channel.assertQueue(queue);
        channel.sendToQueue(queue, messageBuffer);
    }

    //    console.log(" [%s]: Result (songId: \"%s\" -> status: %s, payload: %s) sent to queue \"%s\"", greenCheckbox, songId, status, JSON.stringify(payload, null, 2), queue);
    console.log(" [%s]: Result (songId: \"%s\" -> status: %s, payload: %s) sent to queue \"%s\"", greenCheckbox, songId, status, "not shown here (array of segments)", queue);
}

function isValidNumber(value) {
    return typeof value === 'number' && !isNaN(value) && value >= 0;
}

/**
 * Starts the Audio Segmenter MERmaid service
 */
async function startService() {
    try {

        connection = await amqp.connect(`amqp://${user}:${pass}@${host}:${port}/`);
        console.log(" [%s] Connected to RabbitMQ server at %s:%s.", greenCheckbox, host, port);
        channel = await connection.createChannel();

        const queueName = queue_in;

        await channel.assertQueue(queueName); //TODO: check difference between durable or not

        console.log(" [%s] Waiting for messages in %s. To exit press CTRL+C.", yellowInfo, queueName);

        channel.consume(queueName, async (msg) => {
            if (msg !== null) {
                try {
                    //console.log(msg.content.toString());
                    const payload = JSON.parse(msg.content.toString());

                    console.log(" [%s] Received a new message: %s", greenCheckbox, msg.content.toString());

                    const inputFilePath = path.join('Audios', payload.inputFile);
                    const outputSettings = payload.outputSettings;

                    // Set default values if outputSettings are missing or incorrect
                    const defaultSegmentLength = 30;
                    const defaultOverlap = 15;

                    const finalOutputSettings = {
                        segmentLength: isValidNumber(outputSettings.segmentLength) ? outputSettings.segmentLength : defaultSegmentLength,
                        overlap: isValidNumber(outputSettings.overlap) ? outputSettings.overlap : defaultOverlap
                    };

                    await createAudioSegments(inputFilePath, finalOutputSettings.segmentLength, finalOutputSettings.overlap);
                    //console.log(" [%s] Conversion completed.", yellowInfo);

                } catch (error) {
                    console.error(" [%s] Received an invalid (non JSON?) message: %s.", redCrossmark, error);
                }
                channel.ack(msg);
                console.log(" [%s] Waiting for messages in %s. To exit press CTRL+C.", yellowInfo, queueName);
            }
        });

        process.on('SIGINT', () => {
            console.log(' [%s] Received CTRL+C. Closing connection...', redCrossmark);
            channel.close();
            connection.close();
            process.exit();
        });
    } catch (error) {
        console.log(error)
    }
}

if (process.argv.length == 2) {
    // service mode (via rabbitmq queues)
    console.log(' [%s] Starting %s in service mode.', yellowInfo, serviceName);
    startService();
}
else if (process.argv.length == 3) {
    console.log(' [%s] Starting %s in cli mode.', yellowInfo, serviceName);
    const inputFile = process.argv[2]; // Get video URL from command-line argument

    if (inputFile) {
        const inputFilePath = inputFile;
        const outputSettings = {
            segmentLength: 30,
            overlap: 0
        };

        try {
            createAudioSegments(inputFilePath, outputSettings.segmentLength, outputSettings.overlap);
            console.log(' [%s] Segmentation completed.', greenCheckbox);
        } catch (error) {
            console.error(' [%s] Segmentation error: %s', redCrossmark, error);
        }

    }
    else {
        console.error(' [%s] Please provide a valid file path as a command-line argument.', redCrossmark);
        process.exit(1);
    }
}
else {
    console.error(' [%s] Please provide no arguments to start in SERVICE mode, or a valid audio file as a command-line argument.', redCrossmark);
    process.exit(1);
}

console.log(' [%s] KTHXBYE.', yellowInfo);