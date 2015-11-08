"use strict";
const redis = require('redis'),
	client = redis.createClient(),
	FIELD_MAP = {
		SET: 'mail_sender:email_jobs',
		HASH: 'mail_sender:email_job'
	};

function fetch_data ( client, final_callback ) {
	let howManyToFetch = 10;
	client.sort(FIELD_MAP.SET, "limit", "0", howManyToFetch, "by", 
		`${FIELD_MAP.HASH}:*->priority.created`, (err, email_job_ids) => {
			process_email_jobs(client, email_job_ids, final_callback);
		});
}
function process_email_jobs (client, email_job_ids, final_callback) {
	let client_job_multi = client.multi();

	email_job_ids.forEach((email_job_id,index,arr) => {
		let emailItemKey = get_email_job_key( email_job_id );
		console.log(emailItemKey);
		client_job_multi
			.hgetall(emailItemKey)
			.del(emailItemKey)
			.zrem(FIELD_MAP.SET, email_job_id);
	});	
	client_job_multi.exec( (err, responses) => {
		if ( !!err ) console.log(err);
		send_collected_emails(responses, client, final_callback);
	});
}
function send_collected_emails(responses) {
	let email_promises = [];
	console.log( 'MULTI EXEC:', responses );
	responses.forEach((email_job, index, arr) => {
		if ( !!email_job && !!email_job.job_id ) {
			email_promises.push(new Promise( (resolve, reject) => {
				process_email_job(email_job, resolve, reject);
			}));
		}
	});
	if ( !!email_promises.length ) {
		Promise.all(email_promises)
			.then(function (values) {
				console.log('final_callback!', values.length );
				final_callback( client, fetch_data );
			}, function () {
				console.log('Promise failed');
			});
	} else {
		console.log('No email jobs found.');
		final_callback( client, fetch_data );
	}
}
function get_email_job_key ( email_job_id ) {
	return `${FIELD_MAP.HASH}:${email_job_id}`;
}
function process_email_job (email_job, resolve, reject) {
	send_email( email_job, resolve, reject );
}
function send_email ( email_job, resolve, reject ) {
	setTimeout(() => {
		console.log( 'SENT:', email_job );
		resolve(email_job);
	}, Math.floor((Math.random()*200)+100) );
}
function on_email_job_published (channel, message) {
	console.log('client message', channel, message)
}
function assign_listeners ( client ) {
	client.on('ready', () => { 
		console.log('redis client ready');
	})
	client.on('connect', () => { 
		console.log('redis client connected');
		//client.subscribe('mail_sender:email_jobs');
		fetch_data( client, fetch_data );
	})
	client.on('message', on_email_job_published);

	client.on('reconnecting', () => { console.log('redis client reconnecting') });
	client.on('error', (e) => { console.log('redis client error', e) });

	client.on('idle', () => { console.log('redis client idle') });
	client.on('end', () => { console.log('redis client end') });
	client.on('drain', () => { console.log('redis client drain') });
}
function init_mailer ( client ) {
	assign_listeners( client );
}

init_mailer(client);