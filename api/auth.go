package api

import (
	"context"
	"crypto/sha512"
	"crypto/subtle"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/badoux/checkmail"
)

var (
	userIDContextKey = struct{}{}
)

func (api *API) HandleAPIRegister(w http.ResponseWriter, r *http.Request) {
	requestBody := struct {
		Email  string `json:"email"`
		Verify string `json:"verify"`
	}{}
	err := json.NewDecoder(r.Body).Decode(&requestBody)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	email := requestBody.Email
	verify := requestBody.Verify

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

	// Create a user.
	_, err = api.db.Exec("INSERT INTO users (id, email) VALUES (encode(gen_random_bytes(5), 'hex'), $1)", email)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`Something went wrong.`))
		return
	}

	ts := fmt.Sprint(time.Now().Unix())

	emailContents := fmt.Sprintf(`Welcome to ReadFaster!

Thanks for registering. Click on the following link to verify your email address and magically log in.

https://www.readfaster.app/app/auth?email=%s&ts=%s&verify=%x
`, url.QueryEscape(email), ts, sha512.Sum512_256([]byte(api.recaptchaSecret+ts+email)))

	htmlEmailContents := fmt.Sprintf(`<p>Welcome to ReadFaster!</p><p>Thanks for registering. Click on the following link to magically log in:

	<a style="font-weight: bold;" href="https://www.readfaster.app/app/auth?email=%s&ts=%s&verify=%x">Log in</a></p>
`,
		url.QueryEscape(email), ts, sha512.Sum512_256([]byte(api.recaptchaSecret+ts+email)))

	err = api.sendMail(email, "Welcome to ReadFaster!", emailContents, htmlEmailContents)
	if err != nil {
		log.Println("error sending email", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusAccepted)
}

func (api *API) HandleAPILogin(w http.ResponseWriter, r *http.Request) {
	requestBody := struct {
		Email  string `json:"email"`
		Verify string `json:"verify"`
	}{}
	err := json.NewDecoder(r.Body).Decode(&requestBody)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	email := requestBody.Email
	verify := requestBody.Verify

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

	// Validate user.

	userID := ""
	err = api.db.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&userID)
	if err != nil {
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	_ = userID

	ts := fmt.Sprint(time.Now().Unix())

	emailContents := fmt.Sprintf(`Click on the following link to magically log in.

https://www.readfaster.app/app/auth?email=%s&ts=%s&verify=%x

Cheers!`, url.QueryEscape(email), ts, sha512.Sum512_256([]byte(api.recaptchaSecret+ts+email)))

	htmlEmailContents := fmt.Sprintf(`<p>Click on the following link to magically log in:

	<a style="font-weight: bold;" href="https://www.readfaster.app/app/auth?email=%s&ts=%s&verify=%x">Log in</a></p>
	`,
		url.QueryEscape(email), ts, sha512.Sum512_256([]byte(api.recaptchaSecret+ts+email)))

	err = api.sendMail(email, "ReadFaster Login Link", emailContents, htmlEmailContents)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusAccepted)
}

func (api *API) HandleAuth(w http.ResponseWriter, r *http.Request) {
	email := r.URL.Query().Get("email")
	ts := r.URL.Query().Get("ts")
	verify := r.URL.Query().Get("verify")

	log.Println("verify", email, ts, verify)

	verifyBytes, err := hex.DecodeString(verify)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`Invaild verify parameter.`))
		return
	}

	requestHash := sha512.Sum512_256([]byte(api.recaptchaSecret + ts + email))
	if subtle.ConstantTimeCompare(requestHash[:], verifyBytes) != 1 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`Bad verify parameter.`))
		return
	}

	unixTs, err := strconv.ParseInt(ts, 10, 64)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`Invaild ts parameter.`))
		return
	}

	if time.Unix(unixTs, 0).Before(time.Now().Add(-15 * time.Minute)) {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`Link expired.`))
		return
	}

	sessionID := ""
	err = api.db.QueryRow(`INSERT INTO auth_sessions (id, user_id, expires_at)
							VALUES (encode(gen_random_bytes(16), 'hex'),
									(SELECT id FROM users WHERE email = $1),
									now()+interval '7 day') RETURNING id`,
		email).Scan(&sessionID)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`Something went wrong.`))
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "rfa",
		Value:    sessionID,
		Path:     "/",
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		Secure:   !api.devMode,
		HttpOnly: true,
	})

	w.Header().Set("Refresh", "2; /app")
	w.Write([]byte(`Verified!`))
}

func (api *API) HandleLogout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("rfa")
	if err != nil {
		w.Header().Set("Refresh", "1; /app")
		w.Write([]byte(`Logged out.`))
		return
	}

	_, err = api.db.Exec("DELETE FROM auth_sessions WHERE id = $1", cookie.Value)
	if err != nil {
		log.Println(err)
	}

	w.Header().Set("Refresh", "1; /app")
	http.SetCookie(w, &http.Cookie{
		Name:     "rfa",
		Value:    "",
		Path:     "/",
		Expires:  time.Now(),
		Secure:   !api.devMode,
		HttpOnly: true,
	})
	w.Write([]byte(`Logged out.`))
}

// WithAuth wraps a handler with authentication checks.
func (api *API) WithAuth(f func(w http.ResponseWriter, r *http.Request)) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("rfa")
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		// Get user ID based on this session.
		userID := ""
		err = api.db.QueryRow("SELECT user_id FROM auth_sessions WHERE id = $1 AND expires_at > now()", cookie.Value).Scan(&userID)
		if err != nil {
			if err == sql.ErrNoRows {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			log.Println(err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		f(w, r.WithContext(context.WithValue(r.Context(), userIDContextKey, userID)))
	}
}
