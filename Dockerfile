FROM golang:alpine AS build-go

COPY . /src

RUN cd /src && go build -o main

FROM alpine

RUN mkdir -p /serve

COPY --from=build-go /src/main /serve/main
COPY ui /serve/ui

COPY entrypoint.sh /serve/entrypoint.sh

ENTRYPOINT /serve/entrypoint.sh
