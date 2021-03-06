package api

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/badoux/checkmail"
	"github.com/gomodule/oauth1/oauth"
	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
	"github.com/mailgun/mailgun-go/v4"
)

type Options struct {
	Listen          string
	DBConnString    string
	RecaptchaSecret string
	MailgunKey      string
	AuthSecret      string
	GoodreadsKey    string
	GoodreadsSecret string
	DevMode         bool
}

type API struct {
	db              *sql.DB
	recaptchaSecret string
	mg              mailgun.Mailgun
	authSecret      string
	goodreads       *oauth.Client
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
		authSecret:      opts.AuthSecret,
		goodreads: &oauth.Client{
			TemporaryCredentialRequestURI: "https://www.goodreads.com/oauth/request_token",
			ResourceOwnerAuthorizationURI: "https://www.goodreads.com/oauth/authorize",
			TokenRequestURI:               "https://www.goodreads.com/oauth/access_token",
			Credentials: oauth.Credentials{
				Token:  opts.GoodreadsKey,
				Secret: opts.GoodreadsSecret,
			},
		},
		devMode: opts.DevMode,
	}

	r := mux.NewRouter()

	// API
	r.Methods("POST").Path("/api/register").HandlerFunc(api.HandleAPIRegister)
	r.Methods("POST").Path("/api/login").HandlerFunc(api.HandleAPILogin)
	r.Methods("GET").Path("/api/user").HandlerFunc(api.WithAuth(api.HandleAPIGetUser))
	r.Methods("PUT").Path("/api/password").HandlerFunc(api.WithAuth((api.HandleAPIPutPassword)))
	r.Methods("GET").Path("/api/reading/sessions").HandlerFunc(api.WithAuth(api.HandleAPIGetReadingSessions))
	r.Methods("POST").Path("/api/reading/sessions").HandlerFunc(api.WithAuth(api.HandleAPIPostReadingSessions))
	r.Methods("DELETE").Path("/api/reading/sessions/{reading_session_timestamp}").HandlerFunc(api.WithAuth(api.HandleAPIDeleteReadingSessions))
	r.Methods("GET").Path("/api/goodreads/currently_reading").HandlerFunc(api.WithAuth(api.WithGoodreadsCredentials(api.WithGoodreadsUserID(api.HandleAPIGetGoodreadsReviews))))
	r.Methods("POST").Path("/api/goodreads/books/{goodreads_book_id}/progress").HandlerFunc(api.WithAuth(api.WithGoodreadsCredentials(api.WithGoodreadsUserID(api.HandleAPIPostGoodreadsProgress))))

	r.Methods("GET").Path("/goodreads/auth").HandlerFunc(api.WithAuth(api.HandleGoodreadsAuth))
	r.Methods("GET").Path("/goodreads/callback").HandlerFunc(api.WithAuth(api.HandleGoodreadsCallback))

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

func (api *API) HandleAPIGetUser(w http.ResponseWriter, r *http.Request) {
	userIDVal := r.Context().Value(userIDContextKey)
	if userIDVal == nil {
		log.Println("missing user ID in context")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	userID := userIDVal.(string)

	email := ""
	err := api.db.QueryRow("SELECT email FROM users WHERE id = $1", userID).Scan(&email)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	hasGoodreads := false
	tmp := ""
	err = api.db.QueryRow("SELECT user_id FROM goodreads_tokens WHERE user_id = $1", userID).Scan(&tmp)
	if err != nil {
		if err == sql.ErrNoRows {
			hasGoodreads = false
		} else {
			log.Println(err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	} else {
		hasGoodreads = true
	}

	w.Header().Add("content-type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user_id":       userID,
		"email":         email,
		"has_goodreads": hasGoodreads,
	})
}
