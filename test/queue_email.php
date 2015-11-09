<?php 
/**
 * Places an email into our email queue, to be sent later (normally within a second or so).
 * @param array $email
 * @param string $priority an unsigned integer as a string, between 0 and 10. Lower has higher priority, so 0 is highest priority.
 */
function queue_email($email, $priority = '9')
{	
	$redis = new Redis();
	$host = '127.0.0.1';
	$port = 6379;
	$redis_connected = $redis->pconnect($host, $port);

	echo "Redis Connected: $redis_connected\n";
	if ($redis_connected)
	{
		$email_job = [];
		$email_job['priority.created'] = $priority . '.' . time();
		$email_job['data'] = json_encode($email);

   	 	// Increase job index
		$email_job_index = $redis->incr('mail_sender:email_job_index');
		$email_job['job_id'] = $email_job_index;

		var_dump($email_job);

   	 	// Insert job as an atomic transaction
		$redis->multi()
			->hMset("mail_sender:email_job:{$email_job_index}", $email_job) //inserts or overwrites
			->zAdd("mail_sender:email_jobs", 0, $email_job_index) // inserts
			->exec();
	}
}

/**
 * Grab and push test email data into redis
 * @param $limit_rounds number of time function will execute recurstively
 */
function init ( $limit_rounds = 5 ) {
	$limit_rounds--;
	$email_data_array = json_decode( exec('node test/make-test-data.js') );
	
	foreach ($email_data_array as $key => $email_data_item) {
		queue_email( $email_data_item, rand(0,10) );
	}
	if ( $limit_rounds > 0 ) {
		echo "queue_email sleeping for 20. Rounds left: $limit_rounds.";
		sleep(20);
		init($limit_rounds);
	}
}

init();



