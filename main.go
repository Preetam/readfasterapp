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
	devMode := flag.Bool("dev-mode", false, "Enables developer mode")
	flag.Parse()

	err := api.Run(&api.Options{
		Listen:          *listen,
		DBConnString:    *dbConnectionString,
		RecaptchaSecret: *recaptchaSecret,
		DevMode:         *devMode,
		MailgunKey:      *mailgunKey,
	})
	if err != nil {
		log.Fatal(err)
	}
}
