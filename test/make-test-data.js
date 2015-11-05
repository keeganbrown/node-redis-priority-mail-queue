"use strict";

const fs = require('fs');

function generate_email_data () {
	return ({
		subject: 'Test '+(Math.random()),
		to: 'mail'+(Math.random())+'@mailinator.com',
		body: 'test email body'
	});
}
function collect_email_data () {
	let collection = [], limit = 100;
	while (limit--) {
		collection.push( generate_email_data() );
	}
	process.stdout.write( JSON.stringify(collection) );
}
collect_email_data();
