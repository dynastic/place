![DynasticDevelopment](https://github.com/dynasticdevelop/assets/raw/master/images/brand.png)

# Place 2.0

An opensource place alternative, made by [Dynastic Development](https://dynastic.co). Join our [discord](https://discord.gg/CgC8FTg).

## Getting started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

* mongodb
* Node 7 or **higher**
* An internet connection

### Installing

* Rename config/config.example.js to config/config.js
    * Set a strong secret in the secret field!
* Run `npm i` to install dependencies
* Finally, run `node app.js`

## Deployment

Please only host your own copy if you abide by the [license](https://github.com/dynasticdevelop/place/blob/master/LICENSE). **Failure to comply will result in legal action.**

When deploying, it is reccomended you use a daemon to keep the server alive. We use `pm2`, however, you could use something like `forever`.

### Deploying with pm2

* You'll need to install `pm2` **globally**, using `npm i -g pm2`
* To start place, it's as simple as `pm2 start app.js --name=place`

You can manage your pm2 instances using `pm2 show place`.

### Other notes

It's reccomended you use a reverse proxy, rather than running place direcly on port 80. Below is our nginx configuration.
```nginx
server {
        listen 80;
        listen [::]:80;

        server_name place.dynastic.co direct-place.dynastic.co;

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

Please make a [pull request](/https://github.com/dynasticdevelop/place/pulls). Before making a pull request, come and chat to us on [discord](https://discord.gg/CgC8FTg), in #contributors.

### Roadmap

Check our currently open issues for an idea on what to work on!

## Authors

* [AppleBetas](https://applebetas.co) - Core developer
* [nullpixel](https://nullpixel.uk) - Core developer

See also the list of [contributors](https://github.com/dynasticdevelop/place/contributors) who participated in this project, and helped make it as great as it is!

## License

Place 2.0 is licensed under the [APGL-3.0 license](https://github.com/dynasticdevelop/place/blob/master/LICENSE). Please see it for details.

## Acknowledgments

* Thanks reddit for /r/place, and the original place
* Thanks to the many subreddits who we work with to make cool art!
