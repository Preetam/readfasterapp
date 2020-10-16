package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"time"

	"github.com/gomodule/oauth1/oauth"
	"github.com/gorilla/mux"
)

var (
	goodreadsCredentialsContextKey = "rfa_goodreads_creds"
	goodreadsUserIDContextKey      = "rfa_goodreads_user_id"
)

func (api *API) WithGoodreadsCredentials(f func(w http.ResponseWriter, r *http.Request)) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		userIDVal := r.Context().Value(userIDContextKey)
		if userIDVal == nil {
			log.Println("missing user ID in context")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		userID := userIDVal.(string)

		creds := &oauth.Credentials{}
		err := api.db.QueryRow("SELECT token, secret FROM goodreads_tokens WHERE user_id = $1", userID).
			Scan(&creds.Token, &creds.Secret)
		if err != nil {
			http.Error(w, "missing Goodreads token", http.StatusUnauthorized)
			return
		}
		f(w, r.WithContext(context.WithValue(r.Context(), goodreadsCredentialsContextKey, creds)))
	}
}

type goodreadsAuthUserResponse struct {
	XMLName xml.Name `xml:"GoodreadsResponse"`
	User    struct {
		ID string `xml:"id,attr"`
	} `xml:"user"`
}

func (api *API) WithGoodreadsUserID(f func(w http.ResponseWriter, r *http.Request)) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		credsVal := r.Context().Value(goodreadsCredentialsContextKey)
		if credsVal == nil {
			http.Error(w, "missing Goodreads token", http.StatusUnauthorized)
			return
		}
		creds := credsVal.(*oauth.Credentials)

		resp, err := api.goodreads.Get(nil, creds, "https://www.goodreads.com/api/auth_user", nil)
		if err != nil {
			http.Error(w, "Internal server error", 500)
			return
		}

		authUserResponse := goodreadsAuthUserResponse{}
		err = xml.NewDecoder(resp.Body).Decode(&authUserResponse)
		if err != nil {
			http.Error(w, "Internal server error: "+err.Error(), 500)
			return
		}

		f(w, r.WithContext(context.WithValue(r.Context(), goodreadsUserIDContextKey, authUserResponse.User.ID)))
	}
}

func (api *API) HandleGoodreadsAuth(w http.ResponseWriter, r *http.Request) {
	userIDVal := r.Context().Value(userIDContextKey)
	if userIDVal == nil {
		log.Println("missing user ID in context")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	callbackURL := "https://www.readfaster.app/goodreads/callback"
	if api.devMode {
		callbackURL = "http://" + r.Host + "/goodreads/callback"
	}

	tempCred, err := api.goodreads.RequestTemporaryCredentials(nil, callbackURL, nil)
	if err != nil {
		http.Error(w, "Error getting temp cred, "+err.Error(), 500)
		return
	}

	marshaled, err := json.Marshal(tempCred)
	if err != nil {
		http.Error(w, "Error marshaling temp cred, "+err.Error(), 500)
		return
	}

	// Store temp creds in cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "rfa_goodreads_token",
		Value:    base64.StdEncoding.EncodeToString(marshaled),
		Path:     "/",
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		Secure:   !api.devMode,
		HttpOnly: true,
	})

	http.Redirect(w, r, api.goodreads.AuthorizationURL(tempCred, map[string][]string{
		"oauth_callback": {callbackURL},
	}), 302)
}

func (api *API) HandleGoodreadsCallback(w http.ResponseWriter, r *http.Request) {
	userIDVal := r.Context().Value(userIDContextKey)
	if userIDVal == nil {
		log.Println("missing user ID in context")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	userID := userIDVal.(string)

	tokenCookie, err := r.Cookie("rfa_goodreads_token")
	if err != nil {
		http.Error(w, "Missing token, "+err.Error(), 500)
		return
	}

	decodedCookie, err := base64.StdEncoding.DecodeString(tokenCookie.Value)
	if err != nil {
		http.Error(w, "Bad token, "+err.Error(), 500)
		return
	}

	tempCred := &oauth.Credentials{}
	err = json.Unmarshal(decodedCookie, &tempCred)
	if err != nil {
		if err != nil {
			http.Error(w, "Bad token, "+err.Error(), 500)
			return
		}
	}

	if tempCred.Token != r.FormValue("oauth_token") {
		http.Error(w, "Unknown oauth_token.", 500)
		return
	}

	tokenCred, _, err := api.goodreads.RequestToken(nil, tempCred, r.FormValue("oauth_verifier"))
	if err != nil {
		http.Error(w, "Error getting request token, "+err.Error(), 500)
		return
	}

	_, err = api.db.Exec("INSERT INTO goodreads_tokens (user_id, token, secret) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET token = $2, secret = $3",
		userID, tokenCred.Token, tokenCred.Secret)
	if err != nil {
		http.Error(w, "error saving token, "+err.Error(), 500)
		return
	}

	http.Redirect(w, r, "/app", 302)
}

type goodreadsReviewListResponse struct {
	XMLName xml.Name `xml:"GoodreadsResponse"`
	Reviews struct {
		Review []struct {
			ID   int `xml:"id"`
			Book struct {
				ID       int    `xml:"id"`
				Title    string `xml:"title"`
				ImageURL string `xml:"image_url"`
				NumPages int    `xml:"num_pages"`
				Authors  struct {
					Author []struct {
						Name string `xml:"name"`
					} `xml:"author"`
				} `xml:"authors"`
			} `xml:"book"`
		} `xml:"review"`
	} `xml:"reviews"`
}

type goodreadsReviewResponse struct {
	XMLName xml.Name `xml:"GoodreadsResponse"`
	Review  struct {
		UserStatuses struct {
			UserStatus []struct {
				Page    int `xml:"page"`
				Percent int `xml:"percent"`
			} `xml:"user_status"`
		} `xml:"user_statuses"`
	} `xml:"review"`
}

type GoodreadsBook struct {
	ID       int      `json:"id"`
	Title    string   `json:"title"`
	ImageURL string   `json:"image_url"`
	Authors  []string `json:"authors"`
	NumPages int      `json:"num_pages"`
	Progress struct {
		Page    int `json:"page"`
		Percent int `json:"percent"`
	} `json:"progress"`
}

func (api *API) HandleAPIGetGoodreadsReviews(w http.ResponseWriter, r *http.Request) {
	credsVal := r.Context().Value(goodreadsCredentialsContextKey)
	if credsVal == nil {
		http.Error(w, "missing Goodreads token", http.StatusUnauthorized)
		return
	}
	creds := credsVal.(*oauth.Credentials)

	goodreadsUserIDVal := r.Context().Value(goodreadsUserIDContextKey)
	if goodreadsUserIDVal == nil {
		http.Error(w, "missing Goodreads user ID", http.StatusUnauthorized)
		return
	}
	goodreadsUserID := goodreadsUserIDVal.(string)

	resp, err := api.goodreads.Get(nil, creds,
		fmt.Sprintf("https://www.goodreads.com/review/list/%s.xml", goodreadsUserID), url.Values{
			"v":     []string{"2"},
			"shelf": []string{"currently-reading"},
		})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	goodreadsResponse := goodreadsReviewListResponse{}
	err = xml.NewDecoder(resp.Body).Decode(&goodreadsResponse)
	if err != nil {
		http.Error(w, "Internal server error: "+err.Error(), 500)
		return
	}

	books := []GoodreadsBook{}
	for _, review := range goodreadsResponse.Reviews.Review {
		book := review.Book
		authors := []string{}
		for _, author := range book.Authors.Author {
			authors = append(authors, author.Name)
		}

		reviewResponse := goodreadsReviewResponse{}
		resp, err = api.goodreads.Get(nil, creds,
			fmt.Sprintf("https://www.goodreads.com/review/show.xml"), url.Values{
				"id": []string{fmt.Sprint(review.ID)},
			})
		if err != nil {
			http.Error(w, "Internal server error: "+err.Error(), 500)
			return
		}
		err = xml.NewDecoder(resp.Body).Decode(&reviewResponse)
		if err != nil {
			http.Error(w, "Internal server error: "+err.Error(), 500)
			return
		}

		bookResponse := GoodreadsBook{
			ID:       book.ID,
			Title:    book.Title,
			ImageURL: book.ImageURL,
			NumPages: book.NumPages,
			Authors:  authors,
		}
		if len(reviewResponse.Review.UserStatuses.UserStatus) > 0 {
			status := reviewResponse.Review.UserStatuses.UserStatus[0]
			bookResponse.Progress.Page = status.Page
			bookResponse.Progress.Percent = status.Percent
		}

		books = append(books, bookResponse)
	}

	w.Header().Add("content-type", "application/json")
	w.Header().Add("cache-control", "max-age=60")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"books": books,
	})
}

func (api *API) HandleAPIPostGoodreadsProgress(w http.ResponseWriter, r *http.Request) {
	credsVal := r.Context().Value(goodreadsCredentialsContextKey)
	if credsVal == nil {
		http.Error(w, "missing Goodreads token", http.StatusUnauthorized)
		return
	}
	creds := credsVal.(*oauth.Credentials)

	goodreadsUserIDVal := r.Context().Value(goodreadsUserIDContextKey)
	if goodreadsUserIDVal == nil {
		http.Error(w, "missing Goodreads user ID", http.StatusUnauthorized)
		return
	}

	goodreadsBook := mux.Vars(r)["goodreads_book_id"]

	_, err := api.goodreads.Post(nil, creds,
		"https://www.goodreads.com/user_status.xml", url.Values{
			"user_status[book_id]": []string{goodreadsBook},
			"user_status[percent]": []string{r.URL.Query().Get("percent")},
		})
	if err != nil {
		log.Println(err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
