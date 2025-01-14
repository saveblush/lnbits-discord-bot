FROM node:19-alpine

# For alpine version
RUN apk update && apk add git

#ARG ACCESS_TOKEN_GITHUB
#RUN git config --global url."https://$ACCESS_TOKEN_GITHUB:x-oauth-basic@github.com/".insteadOf "https://github.com/"

# Create app directory
WORKDIR /app

# copy both 'package.json' and 'package-lock.json' (if available)
COPY package*.json ./

# install project dependencies
RUN npm install
RUN npm install uuid@latest
RUN npm install pm2 -g

# Bundle app source
COPY . .

# Start
CMD ["npm","start"]
