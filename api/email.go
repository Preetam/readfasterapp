package api

import (
	"bytes"
	"context"
	"html/template"
	textTemplatePkg "html/template"
	"log"
	"time"
)

var textTemplate = textTemplatePkg.Must(textTemplatePkg.New("text").Parse(`Hello!

{{ .Content }}

Cheers,
--ReadFaster.app

You are receiving this email because you signed up for ReadFaster.app.
www.readfaster.app
`))

var emailTemplate = template.Must(template.New("email").Parse(`
<!DOCTYPE html>
<html>
<head>
<style>
a {
	color: black;
}
</style>
</head>
<body>
<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif; width: 40rem; margin: 0 auto; max-width: 90%">
<div style="background-color: black; color: white; text-align: center; padding: 2rem; font-size: 1.3rem; font-weight: bold;">
<a style="text-decoration: none; color: white;" href="/">ReadFaster</a>
</div>

<div style="margin: 2rem 0;">
<p style="margin-bottom: 1rem;">Hello!</p>

<div>
{{ .HTMLContent }}
</div>

<p style="margin-bottom: 1rem;">Cheers,<br/>
&mdash;ReadFaster.app
</p>
</div>

<div style="background-color: black; color: #888; font-size: 0.75rem; text-align: center; padding: 1rem;">
You’re receiving this email because you signed up for <a style="color: #888" href="https://www.readfaster.app">ReadFaster.app</a>.
</div>
</div>
</body>

</html>
`))

func (api *API) sendMail(to, subject, content, htmlContent string) error {
	if htmlContent != "" {
		buf := &bytes.Buffer{}
		err := emailTemplate.Execute(buf, map[string]interface{}{
			"HTMLContent": template.HTML(htmlContent),
		})
		if err != nil {
			return err
		}
		htmlContent = string(buf.Bytes())
	}

	buf := &bytes.Buffer{}
	err := textTemplate.Execute(buf, map[string]interface{}{
		"Content": content,
	})
	if err != nil {
		return err
	}
	content = string(buf.Bytes())

	if api.devMode {
		log.Println("Email")
		log.Println("===")
		log.Println("To:", to)
		log.Println("Subject:", subject)
		log.Println("Content:", content)
		if htmlContent != "" {
			log.Println("HTML Content:", htmlContent)
		}
		return nil
	}

	msg := api.mg.NewMessage("ReadFaster <noreply@mg.readfaster.app>", subject, content, to)
	msg.SetReplyTo("Preetam <readfaster@preet.am>")
	msg.SetHtml(htmlContent)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
	defer cancel()
	_, _, err = api.mg.Send(ctx, msg)
	return err
}
