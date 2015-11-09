#!/bin/bash
#INSTALL PHP REDIS
sudo pecl install redis
sudo touch /etc/php5/cli/conf.d/30-redis.ini
sudo bash -c "cat >> /etc/php5/cli/conf.d/30-redis.ini" <<EOF
	extension="redis.so"
EOF

#CONFIGURE REDIS DAEMON
cd /home/vagrant/node-redis-priority-mail-queue/config/
sudo mkdir /etc/redis
sudo mkdir /var/redis
sudo mkdir /var/redis/6379
sudo rm /etc/init.d/redis_6379
sudo rm /etc/redis/6379.conf
sudo cp redis_init_script /etc/init.d/redis_6379
sudo cp redis.conf /etc/redis/6379.conf
sudo update-rc.d redis_6379 defaults
sudo /etc/init.d/redis_6379 start