FROM golang:alpine AS build-go

COPY . /src

RUN cd /src && go build -o main

FROM node AS build-ui

COPY ui /ui

RUN cd /ui && npm i
RUN cd /ui && npm run build

RUN cd /ui/public/app && sed -i "s/app.js/app.js?$(date +%s)/" index.html

FROM alpine

RUN mkdir -p /serve

COPY --from=build-go /src/main /serve/main
COPY --from=build-ui /ui/public /serve/ui

COPY entrypoint.sh /serve/entrypoint.sh

ENTRYPOINT /serve/entrypoint.sh
