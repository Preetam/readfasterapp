package main

import (
	"flag"
	"log"

	"github.com/Preetam/readfasterapp/api"
)

func main() {
	listen := flag.String("listen", "127.0.0.1:8000", "Listen address")
	dbConnectionString := flag.String("db", "", "DB connection string")
	recaptchaSecret := flag.String("recaptcha-secret", "", "reCAPTCHA secret")
	mailgunKey := flag.String("mailgun-key", "", "Mailgun API key")
	authSecret := flag.String("auth-secret", "", "Auth secret")
	goodreadsKey := flag.String("goodreads-key", "", "Goodreads key")
	goodreadsSecret := flag.String("goodreads-secret", "", "Goodreads secret")
	devMode := flag.Bool("dev-mode", false, "Enables developer mode")
	flag.Parse()

	err := api.Run(&api.Options{
		Listen:          *listen,
		DBConnString:    *dbConnectionString,
		RecaptchaSecret: *recaptchaSecret,
		DevMode:         *devMode,
		AuthSecret:      *authSecret,
		GoodreadsKey:    *goodreadsKey,
		GoodreadsSecret: *goodreadsSecret,
		MailgunKey:      *mailgunKey,
	})
	if err != nil {
		log.Fatal(err)
	}
}
