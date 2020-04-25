package api

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

type ReadingSession struct {
	Timestamp int64 `json:"timestamp"`
	Duration  int   `json:"duration"`
}

func (api *API) HandleAPIGetReadingSessions(w http.ResponseWriter, r *http.Request) {
	userIDVal := r.Context().Value(userIDContextKey)
	if userIDVal == nil {
		log.Println("missing user ID in context")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	userID := userIDVal.(string)

	rows, err := api.db.Query("SELECT timestamp, duration FROM reading_sessions WHERE user_id = $1 AND timestamp > extract(epoch from now())-(14*86400) /* two weeks */", userID)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	readingSessions := []ReadingSession{}
	for rows.Next() {
		ts, dur := int64(0), 0
		err = rows.Scan(&ts, &dur)
		if err != nil {
			log.Println(err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		readingSessions = append(readingSessions, ReadingSession{Timestamp: ts, Duration: dur})
	}

	w.Header().Add("content-type", "application/json")
	err = json.NewEncoder(w).Encode(readingSessions)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func (api *API) HandleAPIPostReadingSessions(w http.ResponseWriter, r *http.Request) {
	userIDVal := r.Context().Value(userIDContextKey)
	if userIDVal == nil {
		log.Println("missing user ID in context")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	userID := userIDVal.(string)

	readingSession := ReadingSession{}

	err := json.NewDecoder(r.Body).Decode(&readingSession)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	now := time.Now().Unix()
	readingSession.Timestamp = now

	_, err = api.db.Exec("INSERT INTO reading_sessions (user_id, timestamp, duration) VALUES ($1, $2, $3)",
		userID, readingSession.Timestamp, readingSession.Duration)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Add("content-type", "application/json")
	err = json.NewEncoder(w).Encode(readingSession)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func (api *API) HandleAPIDeleteReadingSessions(w http.ResponseWriter, r *http.Request) {
	userIDVal := r.Context().Value(userIDContextKey)
	if userIDVal == nil {
		log.Println("missing user ID in context")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	userID := userIDVal.(string)

	readingSessionTimestamp := mux.Vars(r)["reading_session_timestamp"]

	_, err := api.db.Exec("DELETE FROM reading_sessions WHERE user_id = $1 AND timestamp = $2",
		userID, readingSessionTimestamp)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}
