package main

import (
	"flag"
	"log"
	"net/http"
)

func main() {
	listen := flag.String("listen", "127.0.0.1:8000", "Listen address")
	flag.Parse()

	fs := http.FileServer(http.Dir("ui"))
	http.Handle("/", fs)
	log.Println("Listening on", *listen)
	log.Fatal(http.ListenAndServe(*listen, nil))
}
