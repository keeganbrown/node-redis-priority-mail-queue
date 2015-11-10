"use strict";
var config;
try {
	config = require('./config.js');
} catch (e) {
	throw "Need to add a config.js file. See config.example.js for example."
}

const redis = require('redis'),
	client = redis.createClient(),
	pubsubclient = redis.createClient(),

	mandrill = require('mandrill-api/mandrill'),
	mandrill_client = new mandrill.Mandrill(config.MANDRILL_API_KEY),

	FIELD_MAP = {
		INDEX: 'mail_sender:email_job_index',
		SET: 'mail_sender:email_jobs',
		HASH: 'mail_sender:email_job'
	},

	idle_poll_interval = 1000, //Lower this number to increase the speed of the db polling on idle.
	how_many_to_fetch = 30, //This number dramatically effects the throughput of the script. Higher == faster, more memory overhead.
	performance_timer = Date.now(); //this can be removed, it's for throughput testing only

//var mandrill_user_info = null;

function fetch_data ( client, final_callback ) {
	console.log('fetch more data. performance: ', Date.now()-performance_timer, process.memoryUsage());

	client.sort(FIELD_MAP.SET, "limit", "0", how_many_to_fetch, "by", 
		`${FIELD_MAP.HASH}:*->priority.created`, (err, email_job_ids) => {
			build_email_jobs_multi( client, email_job_ids, final_callback );
		});
}
function build_email_jobs_multi (client, email_job_ids, final_callback) {
	let client_job_multi = client.multi();

	email_job_ids.forEach((email_job_id,index,arr) => {
		let email_item_key = get_email_job_key( email_job_id );
		console.log(email_item_key);
		client_job_multi
			.hgetall(email_item_key)
			.del(email_item_key)
			.zrem(FIELD_MAP.SET, email_job_id);
	});	
	client_job_multi.exec( (err, responses) => {
		if ( !!err ) console.log(err);
		send_collected_emails(responses, client, final_callback);
	});
}
function send_collected_emails (responses, client, final_callback) {
	let email_promises = [];
	//console.log( 'MULTI EXEC:', responses );
	responses.forEach((email_job, index, arr) => {
		if ( !!email_job && !!email_job.job_id && !!email_job.data ) {
			email_promises.push(new Promise( (resolve, reject) => {
				process_email_job(email_job, resolve, reject, client);
			}));
		}
	});
	if ( !!email_promises.length ) {
		Promise.all(email_promises)
			.then(function (values) {
				console.log('Promise queue final_callback!', values.length );
				final_callback( client, final_callback );
			}, function () {
				console.log('Promise queue failed. Some entries might be lost.');
				process.nextTick( do_idle_redis_poll );
			});
	} else {
		console.log(`No email jobs found. Waiting ${idle_poll_interval}ms to try again.`);
		process.nextTick( do_idle_redis_poll );
	}
}
function do_idle_redis_poll () {
	setTimeout(() => {
		fetch_data( client, fetch_data );			
	}, idle_poll_interval);
}
function process_email_job (email_job, resolve, reject, client) {
	//Asyncronize the sending function.
	process.nextTick(() => {
		send_email( email_job, resolve, reject, client );
	});
}
function send_email ( email_job, resolve, reject, client ) {
	mandrill_client.messages.send(
		{'message': JSON.parse(email_job.data), 'async': true },
		function(result) {
			console.log( 'EMAIL JOB:', email_job.job_id, result.status );
			if ( result.status == 'rejected' ) {
				handle_send_rejection( email_job, resolve, reject, result );
			} else {
				resolve(email_job);				
			}
		}, function(e) {
			//This will usually occur if the API is unavailable for some reason.
		    console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
		    reinsert_email_job(email_job, resolve, reject, client);	    
		});
}
function handle_send_rejection (email_job, resolve, reject, result) {
	//Should we handle rejections differently? Do anything special?
	resolve(email_job);		
}
function reinsert_email_job (email_job, resolve, reject, client) {
	console.log('API ERROR. Adding email job back to redis.', email_job.job_id );
	client.multi()
		.hmset( get_email_job_key(email_job.job_id), email_job ) //inserts or overwrites
		.zadd( FIELD_MAP.SET, 0, email_job.job_id) // inserts
		.exec( (err, responses) => { 
			console.log('Email Re-added.', email_job);
			resolve(email_job);
		});
}


function get_email_job_key ( email_job_id ) {
	return `${FIELD_MAP.HASH}:${email_job_id}`;
}
function assign_listeners ( client ) {
	console.log('assign redis client listeners');
	client.on('ready', () => { 
		console.log('redis client ready');
	})
	client.on('connect', () => { 
		console.log('redis client connected');
		fetch_data( client, fetch_data );
	})
	client.on('error', (e) => { 
		console.log('redis client error', e);
	});
	client.on('reconnecting', () => { console.log('redis client reconnecting') });
	client.on('idle', () => { console.log('redis client idle') });
	client.on('end', () => { console.log('redis client end') });
	client.on('drain', () => { console.log('redis client drain') });
}
function init_mailer ( client ) {
	assign_listeners( client );
	mandrill_client.users.info({}, 
		(result) => {
			mandrill_user_info = result;
			console.log( mandrill_user_info );
		}, (error) => {
			console.log( error );
		});
}

init_mailer(client);
