# NodeJS Email Queueing System with Redis
__________
To test the code (adds 1000 entries to redis, and then 'sends' them all):
````bash
vagrant up
vagrant ssh
# note: you'll need to add a config.js file in order for this to work. see config.example.js for example.
cd node-redis-priority-mail-queue/
npm test
````