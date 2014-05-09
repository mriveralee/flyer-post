var mongoose = require('mongoose');

var fbBaseEventUrl = 'http://www.facebook.com/';

var eventSchema = new mongoose.Schema({
  fbId: { type: String, unique: true},

  name: {type: String, default: ''},
  description: {type: String, default: ''},
  privacy: {type: String, default: ''},
  owner: {type: Object, default: {}},
  picture: {type: String, default: ''},
  cover: {type: Object, default: {}},
  start_time: {type: String, default: ''},
  end_time: {type: String, default: ''},

  location: {type: String, default: ''},
  is_date_only: {type: Boolean, default: true},
  ticket_uri: {type: String, default: ''},
  updated_time: {type: String, default: ''},
  timezone: {type: String, default: ''},

  venue: {type: String, default: ''},
  attending: {type: Array, default: []},
  feed: {type: Array, default: []},
  photos: {type: Array, default: []},

  img_url: {type: String, default: ''},

  tags: {type: Array, default: []},
});

// TODO: Get event details from the FB Events API
// TODO: Store in our DB
// TODO: Return results to the pages
// TODO: Make function


/**
 * Hash the password for security.
 */


module.exports = mongoose.model('FPEvents', eventSchema);
