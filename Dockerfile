FROM node:carbon
LABEL maintainer="applebetas@dynastic.co"

# Create app directory
WORKDIR /usr/src/app

# Copy over package.json (and package-lock.json, if applicable)
COPY package*.json yarn.lock ./

# Install app dependencies
RUN yarn install

# Bundle app source
COPY . .

EXPOSE 3000
CMD [ "yarn", "start" ]
