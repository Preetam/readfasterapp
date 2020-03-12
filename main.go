package main

import (
	"flag"
	"log"
	"net/http"
)

func main() {
	listen := flag.String("listen", "127.0.0.1:8000", "Listen address")
	devMode := flag.Bool("dev-mode", false, "Enables developer mode")
	flag.Parse()

	fs := http.FileServer(http.Dir("ui"))
	handler := fs
	if *devMode {
		handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Add("access-control-allow-origin", "*")
			fs.ServeHTTP(w, r)
		})
	}
	http.Handle("/", handler)
	http.Handle("/api/ping", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("access-control-allow-origin", "*")
		w.Header().Add("content-type", "application/json")
		w.Write([]byte(`{"data": "pong"}`))
	}))
	log.Println("Listening on", *listen)
	log.Fatal(http.ListenAndServe(*listen, nil))
}
