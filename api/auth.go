package api

import (
	"crypto/sha512"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/badoux/checkmail"
	"gopkg.in/mailgun/mailgun-go.v1"
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

	ts := fmt.Sprint(time.Now().Unix())

	api.mg.Send(mailgun.NewMessage("noreply@readfaster.app", "Welcome to ReadFaster!", fmt.Sprintf(`Welcome to ReadFaster!


Thanks for registering. Click on the following link to verify your email address and magically log in.

https://www.readfaster.app/app/auth?email=%s&ts=%s&verify=%x

Cheers!`, url.PathEscape(email), ts, sha512.Sum512_256([]byte(ts+api.recaptchaSecret+email))), email))
	w.WriteHeader(http.StatusAccepted)
}

func (api *API) HandleAuth(w http.ResponseWriter, r *http.Request) {
	email := r.URL.Query().Get("email")
	ts := r.URL.Query().Get("ts")
	verify := r.URL.Query().Get("verify")

	verifyBytes, err := hex.DecodeString(verify)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`Invaild verify parameter.`))
		return
	}

	requestHash := sha512.Sum512_256([]byte(ts + api.recaptchaSecret + email))
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

	w.Write([]byte(`Verified!`))
}
