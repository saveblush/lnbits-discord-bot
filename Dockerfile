FROM node:16

#ARG ACCESS_TOKEN_GITHUB
#RUN git config --global url."https://$ACCESS_TOKEN_GITHUB:x-oauth-basic@github.com/".insteadOf "https://github.com/"

# Create app directory
WORKDIR /app

# copy both 'package.json' and 'package-lock.json' (if available)
COPY package*.json ./

# install project dependencies
RUN npm install
RUN npm install pm2 -g

# Bundle app source
COPY . .

# Start
#CMD ["npm","start"]
RUN npm start
