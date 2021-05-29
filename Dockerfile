FROM node:14-alpine

ARG HOST=localhost
ARG USER=guest
ARG PASS=guest
ARG PORT=5672
ARG MNG_PORT=15672
ARG TIME=10

COPY ./src /segmentation

WORKDIR /segmentation

RUN apk --no-cache add curl ffmpeg && \
    mkdir /Audios && rm -rf /segmentation/test && \
    npm install && chmod +x ./wait-for-rabbit.sh

ENTRYPOINT ["./wait-for-rabbit.sh", "node", "segmentation"]