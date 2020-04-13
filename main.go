package main

import (
	"database/sql"
	"flag"
	"log"
	"net/http"
	"time"

	"github.com/badoux/checkmail"
	_ "github.com/lib/pq"
)

func setupDatabase(db *sql.DB) error {
	var err error
	_, err = db.Exec("CREATE TABLE IF NOT EXISTS launch_subscribers (email TEXT PRIMARY KEY)")
	if err != nil {
		return err
	}
	return nil
}

func main() {
	listen := flag.String("listen", "127.0.0.1:8000", "Listen address")
	dbConnectionString := flag.String("db", "", "DB connection string")
	devMode := flag.Bool("dev-mode", false, "Enables developer mode")
	flag.Parse()

	db, err := sql.Open("postgres", *dbConnectionString)
	if err != nil {
		time.Sleep(2 * time.Second)
		log.Fatal(err)
	}

	if err = setupDatabase(db); err != nil {
		time.Sleep(2 * time.Second)
		log.Fatal(err)
	}

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

	http.Handle("/launch-subscribe", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * time.Second)
		email := r.URL.Query().Get("email")
		if err = checkmail.ValidateFormat(email); err != nil {
			log.Println(err)
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte(`Is your email address correct? It doesn't look correct.`))
			return
		}
		_, err := db.Exec("INSERT INTO launch_subscribers (email) VALUES ($1) ON CONFLICT DO NOTHING", email)
		if err == nil {
			http.Redirect(w, r, "/subscribed.html", http.StatusSeeOther)
		} else {
			log.Println(err)
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`Something went wrong!`))
		}
	}))

	log.Println("Listening on", *listen)
	log.Fatal(http.ListenAndServe(*listen, nil))
}
