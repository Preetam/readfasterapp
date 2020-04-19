package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/badoux/checkmail"
	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
	"github.com/mailgun/mailgun-go/v4"
)

type Options struct {
	Listen          string
	DBConnString    string
	RecaptchaSecret string
	MailgunKey      string
	DevMode         bool
}

type API struct {
	db              *sql.DB
	recaptchaSecret string
	mg              mailgun.Mailgun
	devMode         bool
}

func Run(opts *Options) error {
	db, err := sql.Open("postgres", opts.DBConnString)
	if err != nil {
		time.Sleep(2 * time.Second)
		return err
	}

	err = setupDatabase(db)
	if err != nil {
		return err
	}

	api := &API{
		db:              db,
		recaptchaSecret: opts.RecaptchaSecret,
		mg:              mailgun.NewMailgun("mg.readfaster.app", opts.MailgunKey),
		devMode:         opts.DevMode,
	}

	r := mux.NewRouter()

	// API
	r.Methods("POST").Path("/api/register").HandlerFunc(api.HandleAPIRegister)
	r.Methods("POST").Path("/api/login").HandlerFunc(api.HandleAPILogin)
	r.Methods("GET").Path("/api/ping").HandlerFunc(api.WithAuth(api.HandleAPIPing))
	r.Methods("GET").Path("/api/reading_sessions").HandlerFunc(api.WithAuth(api.HandleAPIGetReadingSessions))
	r.Methods("POST").Path("/api/reading_sessions").HandlerFunc(api.WithAuth(api.HandleAPIPostReadingSessions))
	r.Methods("DELETE").Path("/api/reading_sessions/{reading_session_timestamp}").HandlerFunc(api.WithAuth(api.HandleAPIDeleteReadingSessions))

	// Static
	r.HandleFunc("/launch-subscribe", api.HandleLaunchSubscribe)
	r.HandleFunc("/app/auth", api.HandleAuth)
	r.HandleFunc("/app/logout", api.HandleLogout)
	r.PathPrefix("/").HandlerFunc(api.HandleRoot)

	log.Println("Listening on", opts.Listen)

	withLog := http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		fromCloudFront := req.Header.Get(("from-cloudfront")) == "true"
		ip := getIP(req)
		if fromCloudFront {
			ip += " (CloudFront)"
		}
		log.Printf("[%s] %s %v", ip, req.Method, req.URL)
		r.ServeHTTP(w, req)
	})

	return http.ListenAndServe(opts.Listen, withLog)
}

func (api *API) HandleRoot(w http.ResponseWriter, r *http.Request) {
	if strings.HasPrefix(r.URL.Path, "/app/") {
		r.URL.Path = "/app/"
	}
	http.FileServer(http.Dir("ui")).ServeHTTP(w, r)
	return
}

func (api *API) HandleLaunchSubscribe(w http.ResponseWriter, r *http.Request) {
	email := r.URL.Query().Get("email")
	verify := r.URL.Query().Get("verify")

	if !api.devMode {
		if verify == "" {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte(`Missing verify parameter.`))
			return
		} else {
			// verify CAPTCHA
			resp, err := http.PostForm("https://www.google.com/recaptcha/api/siteverify", url.Values{
				"secret":   []string{api.recaptchaSecret},
				"response": []string{verify},
			})
			if err != nil {
				log.Println(err)
				w.WriteHeader(http.StatusInternalServerError)
				w.Write([]byte(`Something went wrong!`))
				return
			}
			recaptchaAPIResponse := struct {
				Success bool    `json:"success"`
				Score   float64 `json:"score"`
			}{}

			defer resp.Body.Close()
			err = json.NewDecoder(resp.Body).Decode(&recaptchaAPIResponse)
			if err != nil {
				log.Println(err)
				w.WriteHeader(http.StatusInternalServerError)
				w.Write([]byte(`Something went wrong!`))
				return
			}
			log.Println("recaptcha response:", recaptchaAPIResponse)
			if !recaptchaAPIResponse.Success {
				w.WriteHeader(http.StatusBadRequest)
				w.Write([]byte(`Bad verify parameter.`))
				return
			}
			if recaptchaAPIResponse.Score < 0.5 {
				w.WriteHeader(http.StatusBadRequest)
				w.Write([]byte(`Sorry, you seem like a bot. Please try again.`))
				return
			}
		}
	}

	if err := checkmail.ValidateFormat(email); err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`Is your email address correct? It doesn't look correct.`))
		return
	}
	_, err := api.db.Exec("INSERT INTO launch_subscribers (email) VALUES ($1) ON CONFLICT DO NOTHING", email)
	if err == nil {
		http.Redirect(w, r, "/subscribed.html", http.StatusSeeOther)
	} else {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`Something went wrong!`))
	}
}

func (api *API) HandleAPIPing(w http.ResponseWriter, r *http.Request) {
	userIDVal := r.Context().Value(userIDContextKey)
	if userIDVal == nil {
		log.Println("missing user ID in context")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	userID := userIDVal.(string)
	w.Header().Add("content-type", "application/json")
	w.Write([]byte(fmt.Sprintf(`{"user_id": "%s"}`, userID)))
}
