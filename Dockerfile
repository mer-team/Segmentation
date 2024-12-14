FROM node:18-alpine

ARG HOST=localhost
ARG USER=guest
ARG PASS=guest
ARG PORT=5672
ARG MNG_PORT=15672
ARG TIME=10

RUN apk --no-cache add curl ffmpeg

WORKDIR /segmentation

COPY ./src/package*.json /segmentation/

RUN npm install
# RUN npm install --production

COPY ./src /segmentation

RUN mkdir -p /segmentation/Audios && \
    rm -rf /segmentation/test && \
    chmod +x ./wait-for-rabbit.sh

# RUN apk --no-cache add curl ffmpeg && \
#     mkdir /Audios && rm -rf /segmentation/test && \
#     npm install && chmod +x ./wait-for-rabbit.sh

ENTRYPOINT ["./wait-for-rabbit.sh", "node", "segmentationScript"]