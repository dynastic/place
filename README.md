# Dynastic Place

An open-source [r/place](https://reddit.com/r/place) alternative, made by [Dynastic](https://dynastic.co). Want to chat? Join our [Discord server](https://discord.gg/CgC8FTg).

## The state of this project
This project is no longer actively maintained and may not be the best choice for a public service. We welcome contributions and new maintainers, but it can unfortunately no longer be a priority for us. In general, it uses some misguided techniques from formerly-beginner developers and portions may be somewhat hard to maintain due to this (however, any help fixing that are super appreciated).

It's been really cool to see people use this project, whether for their artful creations on [our copy, canvas.place](https://canvas.place), or to run their own special-purpose instances (for example, we heard of some Microsoft interns using it, which was pretty cool) and we're proud of the work everyone put into it.

---

## Getting started

These instructions will help you get an instance of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project in a production environment.

### Prerequisites

* Node 8 or **higher**
* [MongoDB](https://www.mongodb.com) *(sorry)*
* [Yarn package manager](https://www.yarnpkg.com)
* An internet connection

### Installing

1. Copy `config/config.example.js` to `config/config.js`.
2. Configure your Place server as you see fit by modifying the values
   > **Important:** You must set a strong secret in the secret field to protect against cookie-spoofing attacks that could result in attacks on your site!
3. Run `yarn install` to install the dependencies
4. Finally, run `node app.js` to start the server.

### Production Deployment

**Ensure `/var/log/place` exists, and the app can write to it.**

Please only host your own copy if you are willing to abide by the clearly defined [license](https://github.com/dynastic/place/blob/master/LICENSE). **Failure to comply with the listed terms will result in legal action.**

When deploying, it is recommended you use a daemon to keep the server alive. We use `pm2`, but any daemon utility, such as `forever`, should work.

#### Using pm2

1. Get [pm2](http://pm2.keymetrics.io) installed **globally** by running `npm i -g pm2`.
2. Once pm2 is installed, starting Place is as simple as running `pm2 start app.js --name=Place`.

You can manage your pm2 instances using `pm2 show Place`.

You can instruct pm2 to save the currently running pm2 instances and start them at boot with `pm2 startup`.

#### Other notes

It's recommended that you use a reverse proxy rather than running Place direcly on port 80. For this, we recommend Nginx. Below is our nginx configuration:

```nginx
server {
        listen 80;
        listen [::]:80;

        server_name canvas.place;

        include /etc/nginx/global/*;

        error_page 502 /502-error.html;

        location = /502-error.html {
                root   /var/www/place.dynastic.co;
                internal;
        }

        location / {
                proxy_pass http://127.0.0.1:3000;
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection 'upgrade';
                proxy_set_header Host $host;
                proxy_cache_bypass $http_upgrade;
        }

}
```

## Contributing 

Please make a [pull request](/https://github.com/dynastic/place/pulls). Before making a pull request, come and chat with us on [Discord](https://discord.gg/CgC8FTg) in #contributors.

Ensure that all code lints successfully - we have CI that requires this.

### Roadmap

Check our currently open issues for an idea on what to work on!

## Authors

* [Ayden Panhuyzen](https://ayden.dev) - Core Developer
* [Jamie Bishop](https://twitter.com/jamiebishop123) - Core Developer
* [Eric Rabil](https://twitter.com/ericrabil) - Core Developer

Also see the list of [contributors](https://www.github.com/dynastic/place/contributors) who generously donated their time and skills to this project to to make it what it is.

## License

Dynastic Place is licensed under a [modified version of the APGL-3.0 license](https://github.com/dynastic/place/blob/master/LICENSE). Please see it for details.

## Acknowledgments

Thank you to:
* Reddit, for the [original Place](https://reddit.com/r/place).
* Our community for making it worthwhile.
