![Dynastic Development](https://github.com/dynasticdevelop/assets/raw/master/images/brand.png)

# Place 2.0

An open-source place alternative, made by [Dynastic Development](https://dynastic.co). Want to chat? Join our [Discord](https://discord.gg/CgC8FTg).

## Getting started

These instructions will help you get a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

* MongoDB
* Node 7.6.0 or **higher**
* An internet connection

### Installing

* Copy config/config.example.js to config/config.js
* Configure your Place server as you see fit by modifying the values
    * Set a strong secret in the secret field!
* Run `npm i` to install the dependencies
* Finally, run `node app.js`

## Deployment

Please only host your own copy if you are willing to abide by the clearly defined [license](https://github.com/dynasticdevelop/place/blob/master/LICENSE). **Failure to comply with the listed terms will result in legal action.**

When deploying, it is recommended you use a daemon to keep the server alive. We use `pm2`, but any daemon utility, such as `forever`, should work.

### Deploying with pm2

1. Get [pm2](http://pm2.keymetrics.io) installed **globally** by running `npm i -g pm2`.
2. Once pm2 is installed, starting Place is as simple as running `pm2 start app.js --name=Place`.

You can manage your pm2 instances using `pm2 show Place`.

You can instruct pm2 to save the currently running pm2 instances and start them at boot with `pm2 startup`.

### Other notes

It's recommended that you use a reverse proxy rather than running Place direcly on port 80. Below is our nginx configuration.
```nginx
server {
        listen 80;
        listen [::]:80;

        server_name place.dynastic.co;

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

Please make a [pull request](/https://github.com/dynasticdevelop/place/pulls). Before making a pull request, come and chat with us on [Discord](https://discord.gg/CgC8FTg) in #contributors.

### Roadmap

Check our currently open issues for an idea on what to work on!

## Authors

* [AppleBetas](https://applebetas.co) - Core Developer
* [nullpixel](https://nullpixel.uk) - Core Developer

Also see the list of [contributors](https://www.github.com/dynasticdevelop/place/contributors) who participated in this project and helped to make it as great as it is!

## License

Place 2.0 is licensed under the [APGL-3.0 license](https://github.com/dynasticdevelop/place/blob/master/LICENSE). Please see it for details.

## Acknowledgments

Thank you to:
* Reddit for the original Place
* The many subreddits and groups who we work with to make cool art!
