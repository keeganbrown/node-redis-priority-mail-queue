'use strict';

function generate_email_data () {
	return ({
		'html': '<p>Test email body HTML content</p>',
	    'text': 'Test email body text content',
	    'subject': 'Test '+(Math.random()),
	    'from_email': 'from_email'+(Math.random())+'@mailinator.com',
	    'from_name': 'Example Name',
	    'to': [{
	            'email': 'mail'+(Math.random())+'@mailinator.com',
	            'name': 'Mail Test Name',
	            'type': 'to'
	        }],
	    'headers': {
	        'Reply-To': 'reply'+(Math.random())+'@mailinator.com'
	    }		
	});
}
function collect_email_data () {
	let collection = [], limit = 1000;
	while (limit--) {
		collection.push( generate_email_data() );
	}
	process.stdout.write( JSON.stringify(collection) );
}
collect_email_data();
