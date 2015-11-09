# NodeJS Email Queueing System with Redis
__________
To test the code (adds 1000 entries to redis, and then 'sends' them all):
````bash
vagrant up
vagrant ssh
cd node-redis-priority-mail-queue/
npm test
````